import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { basename, dirname, extname, isAbsolute, join, resolve } from "node:path";
import { Readable } from "node:stream";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { GeminiError, analyzeEvidenceSetWithGemini, queryGemini } from "../ai/gemini.ts";
import {
  optimizeEvidenceImageForGemini,
  resolveGeminiImageOptimizationPolicy,
} from "../ai/evidence-image-optimizer.ts";
import { createArkivWalletClient } from "../arkiv/client.ts";
import {
  createAIReviewGeneratedEntity,
  createEvidenceUploadedEntity,
  createJobCompletedEntity,
  createJobCreatedEntity,
} from "../arkiv/event-publishers.ts";
import { createRepositories } from "../repositories/index.ts";
import type {
  AiStatus,
  CreateEvidenceInput,
  CreateJobInput,
  EvidenceType,
  Job,
  JobEvidence,
  JobStatus,
  RepositorySet,
} from "../repositories/ports.ts";

const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
config({ path: resolve(backendRoot, ".env"), quiet: true });

const port = Number(process.env.API_PORT ?? 3001);
const repositories = createRepositories();
let walletClient: ReturnType<typeof createArkivWalletClient> | null = null;
const evidenceFlowTypes: EvidenceType[] = ["before", "progress", "after"];

type ApiContext = {
  repositories: RepositorySet;
};

type SsePayload =
  | { jobId: string; status: "started" }
  | { jobId: string; status: "completed" | "failed"; state: Awaited<ReturnType<typeof loadState>> };

const sseClients = new Set<ServerResponse>();

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

function sendSse(response: ServerResponse, event: string, data: unknown) {
  response.write(`event: ${event}\n`);
  response.write(`data: ${JSON.stringify(data)}\n\n`);
}

function broadcastSse(event: string, data: SsePayload) {
  for (const client of sseClients) {
    try {
      sendSse(client, event, data);
    } catch {
      sseClients.delete(client);
    }
  }
}

function openSse(request: IncomingMessage, response: ServerResponse) {
  response.writeHead(200, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Cache-Control": "no-cache, no-transform",
    "Connection": "keep-alive",
    "Content-Type": "text/event-stream; charset=utf-8",
    "X-Accel-Buffering": "no",
  });
  response.write(": conectado\n\n");
  sseClients.add(response);

  request.on("close", () => {
    sseClients.delete(response);
  });
}

function apiErrorStatus(error: unknown) {
  if (error instanceof GeminiError) {
    if (error.kind === "missing_api_key") return 503;
    return 502;
  }

  return 500;
}

function apiErrorMessage(error: unknown) {
  if (error instanceof GeminiError) {
    return error.message;
  }

  return error instanceof Error ? error.message : "Error desconocido.";
}

function uploadContentType(pathname: string) {
  const extension = extname(pathname).toLowerCase();

  if (extension === ".png") return "image/png";
  if (extension === ".jpg" || extension === ".jpeg") return "image/jpeg";
  if (extension === ".webp") return "image/webp";

  return "application/octet-stream";
}

async function sendUpload(response: ServerResponse, pathname: string) {
  const uploadsDirSetting = process.env.UPLOADS_DIR?.trim() || "./uploads";
  const directory = isAbsolute(uploadsDirSetting) ? uploadsDirSetting : resolve(process.cwd(), uploadsDirSetting);
  const fileName = basename(decodeURIComponent(pathname));
  const buffer = await readFile(join(directory, fileName));

  response.writeHead(200, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Content-Type": uploadContentType(fileName),
  });
  response.end(buffer);
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function readFormData(request: IncomingMessage): Promise<FormData> {
  const webRequest = new Request("http://127.0.0.1", {
    method: request.method,
    headers: request.headers as HeadersInit,
    body: Readable.toWeb(request) as BodyInit,
    duplex: "half",
  } as RequestInit & { duplex: "half" });

  return webRequest.formData();
}

async function loadState(context: ApiContext) {
  const [users, services, providerProfiles, jobs, reviews] = await Promise.all([
    context.repositories.users.list(),
    context.repositories.services.list(),
    context.repositories.services.listProviderProfiles(),
    context.repositories.jobs.list(),
    context.repositories.reviews.list(),
  ]);
  const evidence = (await Promise.all(jobs.map((job) => context.repositories.evidence.listByJobId(job.id)))).flat();
  const arkivEvents = await context.repositories.arkivEvents.list();

  return { users, services, providerProfiles, jobs, evidence, reviews, arkivEvents };
}

async function reloadJob(id: string, context: ApiContext): Promise<Job> {
  const job = await context.repositories.jobs.findById(id);
  if (!job) {
    throw new Error(`No existe el trabajo ${id}.`);
  }

  return job;
}

function ensureStatus(value: string): JobStatus {
  const statuses: JobStatus[] = ["requested", "accepted", "in_progress", "evidence_uploaded", "ai_reviewed", "completed"];

  if (!statuses.includes(value as JobStatus)) {
    throw new Error(`Estado no soportado: ${value}`);
  }

  return value as JobStatus;
}

function ensureEvidenceType(value: string): EvidenceType {
  if (!evidenceFlowTypes.includes(value as EvidenceType)) {
    throw new Error("Tipo de evidencia no soportado para este flujo.");
  }

  return value as EvidenceType;
}

function getWalletClient() {
  walletClient ??= createArkivWalletClient();
  return walletClient;
}

async function createJob(input: CreateJobInput, context: ApiContext) {
  const job = await context.repositories.jobs.create(input);
  await createJobCreatedEntity(job, {
    walletClient: getWalletClient(),
    jobsRepository: context.repositories.jobs,
    evidenceRepository: context.repositories.evidence,
    arkivEventsRepository: context.repositories.arkivEvents,
  });

  return loadState(context);
}

function validateEvidenceFlow(type: EvidenceType, existingEvidence: JobEvidence[]) {
  const hasBefore = existingEvidence.some((item) => item.type === "before");
  const hasAfter = existingEvidence.some((item) => item.type === "after");

  if (existingEvidence.length === 0 && type !== "before") {
    throw new Error("Primero debés cargar la evidencia inicial.");
  }

  if (!hasBefore && (type === "progress" || type === "after")) {
    throw new Error("Primero debés cargar la evidencia inicial.");
  }

  if (hasAfter) {
    throw new Error("El resultado final ya fue cargado para este trabajo.");
  }
}

function extractGeminiSummary(text: string) {
  try {
    const parsed = JSON.parse(text) as {
      verdict?: { public_summary?: unknown; status?: unknown };
      case_summary?: { main_visible_issue?: unknown };
    };
    const publicSummary = parsed.verdict?.public_summary;
    if (typeof publicSummary === "string" && publicSummary.trim()) {
      return publicSummary.trim();
    }

    const mainVisibleIssue = parsed.case_summary?.main_visible_issue;
    if (typeof mainVisibleIssue === "string" && mainVisibleIssue.trim()) {
      return mainVisibleIssue.trim();
    }
  } catch {
    return text.slice(0, 1200);
  }

  return text.slice(0, 1200);
}

type GeminiEvidenceAnalysisItem = {
  id?: unknown;
  visual_observation?: unknown;
  description_match?: unknown;
  confidence?: unknown;
};

type GeminiEvidenceSetAnalysis = {
  evidence_analysis?: unknown;
  verdict?: { public_summary?: unknown; status?: unknown };
  case_summary?: { main_visible_issue?: unknown };
};

function parseGeminiEvidenceSetAnalysis(text: string): GeminiEvidenceSetAnalysis | null {
  try {
    return JSON.parse(text) as GeminiEvidenceSetAnalysis;
  } catch {
    return null;
  }
}

function extractEvidenceAnalysisById(text: string) {
  const parsed = parseGeminiEvidenceSetAnalysis(text);
  if (!parsed || !Array.isArray(parsed.evidence_analysis)) {
    return new Map<string, GeminiEvidenceAnalysisItem>();
  }

  const byId = new Map<string, GeminiEvidenceAnalysisItem>();
  for (const item of parsed.evidence_analysis) {
    if (!item || typeof item !== "object") continue;

    const analysis = item as GeminiEvidenceAnalysisItem;
    if (typeof analysis.id === "string" && analysis.id.trim()) {
      byId.set(analysis.id, analysis);
    }
  }

  return byId;
}

function extractEvidenceSummary(analysis: GeminiEvidenceAnalysisItem | undefined, fallbackSummary: string) {
  if (analysis && typeof analysis.visual_observation === "string" && analysis.visual_observation.trim()) {
    return analysis.visual_observation.trim();
  }

  return fallbackSummary;
}

function extractEvidenceAiStatus(analysis: GeminiEvidenceAnalysisItem | undefined, fallbackStatus: AiStatus): AiStatus {
  if (!analysis) {
    return fallbackStatus;
  }

  if (analysis.description_match === "contradicted") return "rejected";
  if (analysis.description_match === "partially_supported" || analysis.description_match === "not_verifiable") {
    return "warning";
  }

  if (analysis.description_match === "supported") {
    return typeof analysis.confidence === "number" && analysis.confidence < 0.55 ? "warning" : "valid";
  }

  return fallbackStatus;
}

function extractAiStatus(text: string): AiStatus {
  try {
    const parsed = JSON.parse(text) as { verdict?: { status?: unknown } };
    const status = parsed.verdict?.status;

    if (status === "likely_fixed") return "valid";
    if (status === "likely_not_fixed") return "rejected";
    if (status === "partially_fixed" || status === "unclear" || status === "not_enough_evidence") return "warning";
  } catch {
    return "warning";
  }

  return "warning";
}

async function readEvidenceImage(evidence: JobEvidence) {
  const uploadsDirSetting = process.env.UPLOADS_DIR?.trim() || "./uploads";
  const uploadsDir = isAbsolute(uploadsDirSetting) ? uploadsDirSetting : resolve(process.cwd(), uploadsDirSetting);
  const fileName = basename(evidence.localFilePath);

  try {
    return await readFile(join(uploadsDir, fileName));
  } catch {
    const evidencePath = isAbsolute(evidence.localFilePath)
      ? evidence.localFilePath
      : resolve(process.cwd(), evidence.localFilePath);

    return readFile(evidencePath);
  }
}

async function analyzeFinalEvidenceSet(jobId: string, context: ApiContext) {
  const job = await reloadJob(jobId, context);
  const service = await context.repositories.services.findById(job.serviceId);
  const optimizationPolicy = resolveGeminiImageOptimizationPolicy(job, service);
  const evidence = await context.repositories.evidence.listByJobId(jobId);
  const before = evidence.find((item) => item.type === "before");
  const after = [...evidence].reverse().find((item) => item.type === "after");

  if (!before) {
    throw new Error("Para revisar con IA se necesita una evidencia inicial.");
  }

  if (!after) {
    throw new Error("Para revisar con IA se necesita una evidencia final.");
  }

  const evidenceToAnalyze = evidence.filter((item): item is JobEvidence & { type: "before" | "progress" | "after" } =>
    evidenceFlowTypes.includes(item.type),
  );
  const geminiEvidence = await Promise.all(
    evidenceToAnalyze.map(async (item) => {
      const originalBuffer = await readEvidenceImage(item);
      const optimizedImage = await optimizeEvidenceImageForGemini(originalBuffer, optimizationPolicy);

      return {
        id: item.id,
        type: item.type,
        description: item.description,
        sha256Hash: item.sha256Hash,
        createdAt: item.createdAt,
        imageBuffer: optimizedImage.buffer,
        mimeType: optimizedImage.mimeType,
        optimizedMaxDimension: optimizedImage.maxDimension,
        optimizedWidth: optimizedImage.width,
        optimizedHeight: optimizedImage.height,
        optimizationReason: optimizedImage.reason,
      };
    }),
  );

  const result = await analyzeEvidenceSetWithGemini({
    jobId: job.id,
    jobTitle: job.title,
    jobDescription: job.description,
    evidence: geminiEvidence,
  });

  const evidenceAnalysisById = extractEvidenceAnalysisById(result.text);
  const fallbackSummary = extractGeminiSummary(result.text);
  const fallbackStatus = extractAiStatus(result.text);
  await Promise.all(
    evidenceToAnalyze.map((item) =>
      context.repositories.evidence.attachAIReview(item.id, {
        summary: extractEvidenceSummary(evidenceAnalysisById.get(item.id), fallbackSummary),
        status: extractEvidenceAiStatus(evidenceAnalysisById.get(item.id), fallbackStatus),
      }),
    ),
  );

  await context.repositories.jobs.updateStatus(job.id, "ai_reviewed");

  const updatedJob = await reloadJob(job.id, context);
  const updatedAfter = await context.repositories.evidence.findById(after.id);
  if (!updatedAfter) {
    throw new Error(`No existe la evidencia ${after.id}.`);
  }
  const updatedEvidence = await context.repositories.evidence.listByJobId(job.id);

  await createAIReviewGeneratedEntity(
    updatedJob,
    updatedAfter,
    {
      walletClient: getWalletClient(),
      jobsRepository: context.repositories.jobs,
      evidenceRepository: context.repositories.evidence,
      arkivEventsRepository: context.repositories.arkivEvents,
    },
    updatedEvidence,
  );
}

async function markAutomaticAnalysisFailure(jobId: string, context: ApiContext, error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  console.error("No se pudo completar el análisis automático de evidencia.", { name });

  const after = (await context.repositories.evidence.listByJobId(jobId))
    .filter((item) => item.type === "after")
    .at(-1);

  if (!after) return;

  await context.repositories.evidence.attachAIReview(after.id, {
    summary: "No se pudo completar el análisis automático. La evidencia final quedó guardada para revisión manual.",
    status: "warning",
  });
}

async function createEvidence(input: CreateEvidenceInput, context: ApiContext) {
  const job = await reloadJob(input.jobId, context);
  const existingEvidence = await context.repositories.evidence.listByJobId(job.id);
  validateEvidenceFlow(input.type, existingEvidence);

  const evidence = await context.repositories.evidence.create(input);
  await context.repositories.jobs.updateStatus(job.id, "evidence_uploaded");
  const updatedJob = await reloadJob(job.id, context);

  await createEvidenceUploadedEntity(updatedJob, evidence, {
    walletClient: getWalletClient(),
    jobsRepository: context.repositories.jobs,
    evidenceRepository: context.repositories.evidence,
    arkivEventsRepository: context.repositories.arkivEvents,
  });

  if (input.type === "after") {
    broadcastSse("ai_analysis", { jobId: job.id, status: "started" });
    void runBackgroundEvidenceAnalysis(job.id, context);
  }

  return loadState(context);
}

async function runBackgroundEvidenceAnalysis(jobId: string, context: ApiContext) {
  try {
    await analyzeFinalEvidenceSet(jobId, context);
    broadcastSse("ai_analysis", {
      jobId,
      status: "completed",
      state: await loadState(context),
    });
  } catch (error) {
    await markAutomaticAnalysisFailure(jobId, context, error);
    broadcastSse("ai_analysis", {
      jobId,
      status: "failed",
      state: await loadState(context),
    });
  }
}

async function updateJobStatus(jobId: string, status: JobStatus, context: ApiContext) {
  if (status === "ai_reviewed") {
    broadcastSse("ai_analysis", { jobId, status: "started" });

    try {
      await analyzeFinalEvidenceSet(jobId, context);
      const state = await loadState(context);
      broadcastSse("ai_analysis", { jobId, status: "completed", state });
      return state;
    } catch (error) {
      await markAutomaticAnalysisFailure(jobId, context, error);
      const state = await loadState(context);
      broadcastSse("ai_analysis", { jobId, status: "failed", state });
      return state;
    }
  }

  if (status === "completed") {
    await context.repositories.jobs.updateStatus(jobId, "completed");
    const updatedJob = await reloadJob(jobId, context);

    await createJobCompletedEntity(updatedJob, {
      walletClient: getWalletClient(),
      jobsRepository: context.repositories.jobs,
      evidenceRepository: context.repositories.evidence,
      arkivEventsRepository: context.repositories.arkivEvents,
    });

    return loadState(context);
  }

  await context.repositories.jobs.updateStatus(jobId, status);
  return loadState(context);
}

function evidenceHash(buffer: Buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function metadataEvidenceHash(input: Pick<CreateEvidenceInput, "jobId" | "type" | "localFilePath" | "description">) {
  return createHash("sha256")
    .update(`${input.jobId}:${input.type}:${input.localFilePath}:${input.description ?? ""}:${Date.now()}`)
    .digest("hex");
}

function sanitizeFileName(value: string, fallback: string) {
  const sanitized = value.replace(/[<>:"/\\|?*\x00-\x1f]/g, "_").trim();
  return sanitized || fallback;
}

async function persistLocalUpload(fileName: string, buffer: Buffer) {
  const uploadsDirSetting = process.env.UPLOADS_DIR?.trim() || "./uploads";
  const uploadsDir = isAbsolute(uploadsDirSetting) ? uploadsDirSetting : resolve(process.cwd(), uploadsDirSetting);
  await mkdir(uploadsDir, { recursive: true });
  await writeFile(join(uploadsDir, fileName), buffer);
}

async function route(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const context = { repositories };

  if (request.method === "GET" && url.pathname.startsWith("/uploads/")) {
    await sendUpload(response, url.pathname);
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/state") {
    sendJson(response, 200, await loadState(context));
    return;
  }

  if (request.method === "GET" && url.pathname === "/api/events") {
    openSse(request, response);
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ai/gemini/test") {
    const body = await readJson<{ prompt?: string }>(request);
    sendJson(response, 200, await queryGemini(body.prompt));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/ai/gemini/query") {
    const body = await readJson<{ prompt?: string }>(request);
    sendJson(response, 200, await queryGemini(body.prompt));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/jobs") {
    const input = await readJson<CreateJobInput>(request);
    sendJson(response, 201, await createJob(input, context));
    return;
  }

  const evidenceMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/evidence(?:\/([^/]+))?$/);
  if (request.method === "POST" && evidenceMatch) {
    const contentType = request.headers["content-type"] ?? "";
    const routeType = evidenceMatch[2] ? ensureEvidenceType(evidenceMatch[2]) : null;
    let input: CreateEvidenceInput;

    if (contentType.includes("multipart/form-data")) {
      const form = await readFormData(request);
      const formType = form.has("type") ? ensureEvidenceType(String(form.get("type"))) : null;
      if (routeType && formType && routeType !== formType) {
        throw new Error("El tipo de evidencia de la ruta no coincide con el formulario.");
      }

      const type = routeType ?? formType;
      if (!type) {
        throw new Error("La evidencia requiere un tipo válido.");
      }

      const fallbackFileName = `${evidenceMatch[1]}_${type}.jpg`;
      const file = form.get("file");

      if (!(file instanceof File) || file.size === 0) {
        throw new Error("La evidencia requiere un archivo de imagen.");
      }

      const fileName = sanitizeFileName(file.name, fallbackFileName);
      const fileBuffer = Buffer.from(await file.arrayBuffer());
      await persistLocalUpload(fileName, fileBuffer);

      input = {
        jobId: evidenceMatch[1],
        uploadedBy: String(form.get("uploadedBy")),
        type,
        localFilePath: `uploads/${fileName}`,
        publicFileUrl: `/uploads/${fileName}`,
        description: String(form.get("description") ?? ""),
        sha256Hash: evidenceHash(fileBuffer),
        fileBuffer,
        fileName,
        contentType: file.type || "application/octet-stream",
      };
    } else {
      const body = await readJson<Omit<CreateEvidenceInput, "jobId" | "sha256Hash"> & { fileName?: string }>(request);
      const bodyType = body.type ? ensureEvidenceType(body.type) : null;
      if (routeType && bodyType && routeType !== bodyType) {
        throw new Error("El tipo de evidencia de la ruta no coincide con el cuerpo de la solicitud.");
      }

      const type = routeType ?? bodyType;
      if (!type) {
        throw new Error("La evidencia requiere un tipo válido.");
      }

      const fileName = sanitizeFileName(body.fileName?.trim() || `${evidenceMatch[1]}_${type}.jpg`, `${evidenceMatch[1]}_${type}.jpg`);
      input = {
        jobId: evidenceMatch[1],
        uploadedBy: body.uploadedBy,
        type,
        localFilePath: `uploads/${fileName}`,
        publicFileUrl: `/uploads/${fileName}`,
        description: body.description,
        sha256Hash: metadataEvidenceHash({
          jobId: evidenceMatch[1],
          type,
          localFilePath: `uploads/${fileName}`,
          description: body.description,
        }),
      };
    }

    sendJson(response, 201, await createEvidence(input, context));
    return;
  }

  const statusMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/status$/);
  if (request.method === "POST" && statusMatch) {
    const body = await readJson<{ status: string }>(request);
    sendJson(response, 200, await updateJobStatus(statusMatch[1], ensureStatus(body.status), context));
    return;
  }

  sendJson(response, 404, { error: "Ruta no encontrada." });
}

const server = createServer((request, response) => {
  route(request, response).catch((error: unknown) => {
    sendJson(response, apiErrorStatus(error), { error: apiErrorMessage(error) });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`API local lista en http://127.0.0.1:${port}`);
});

process.on("SIGINT", () => {
  repositories.close?.();
  server.close(() => process.exit(0));
});
