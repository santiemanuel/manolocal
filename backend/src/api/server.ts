import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { createHash } from "node:crypto";
import { config } from "dotenv";
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
  Job,
  JobStatus,
  RepositorySet,
} from "../repositories/ports.ts";

config({ quiet: true });

const port = Number(process.env.API_PORT ?? 3001);
const repositories = createRepositories();
let walletClient: ReturnType<typeof createArkivWalletClient> | null = null;

type ApiContext = {
  repositories: RepositorySet;
};

function sendJson(response: ServerResponse, statusCode: number, body: unknown) {
  response.writeHead(statusCode, {
    "Access-Control-Allow-Origin": "http://127.0.0.1:5173",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(JSON.stringify(body));
}

async function readJson<T>(request: IncomingMessage): Promise<T> {
  const chunks: Buffer[] = [];

  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  const text = Buffer.concat(chunks).toString("utf8");
  return text ? (JSON.parse(text) as T) : ({} as T);
}

async function loadState(context: ApiContext) {
  const jobs = await context.repositories.jobs.list();
  const evidence = (await Promise.all(jobs.map((job) => context.repositories.evidence.listByJobId(job.id)))).flat();
  const arkivEvents = await context.repositories.arkivEvents.list();

  return { jobs, evidence, arkivEvents };
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

async function createEvidence(input: CreateEvidenceInput, context: ApiContext) {
  const job = await reloadJob(input.jobId, context);
  const evidence = await context.repositories.evidence.create(input);
  await context.repositories.jobs.updateStatus(job.id, "evidence_uploaded");
  const updatedJob = await reloadJob(job.id, context);

  await createEvidenceUploadedEntity(updatedJob, evidence, {
    walletClient: getWalletClient(),
    jobsRepository: context.repositories.jobs,
    evidenceRepository: context.repositories.evidence,
    arkivEventsRepository: context.repositories.arkivEvents,
  });

  return loadState(context);
}

async function updateJobStatus(jobId: string, status: JobStatus, context: ApiContext) {
  if (status === "ai_reviewed") {
    const evidence = (await context.repositories.evidence.listByJobId(jobId)).at(-1);
    if (!evidence) {
      throw new Error("No hay evidencia para revisar con IA.");
    }

    const review: { summary: string; status: AiStatus } = {
      summary: "La evidencia parece consistente con el servicio y no muestra alertas criticas.",
      status: "valid",
    };

    await context.repositories.evidence.attachAIReview(evidence.id, review);
    await context.repositories.jobs.updateStatus(jobId, "ai_reviewed");

    const updatedJob = await reloadJob(jobId, context);
    const updatedEvidence = await context.repositories.evidence.findById(evidence.id);
    if (!updatedEvidence) {
      throw new Error(`No existe la evidencia ${evidence.id}.`);
    }

    await createAIReviewGeneratedEntity(updatedJob, updatedEvidence, {
      walletClient: getWalletClient(),
      jobsRepository: context.repositories.jobs,
      evidenceRepository: context.repositories.evidence,
      arkivEventsRepository: context.repositories.arkivEvents,
    });

    return loadState(context);
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

function evidenceHash(input: Pick<CreateEvidenceInput, "jobId" | "type" | "localFilePath" | "description">) {
  return createHash("sha256")
    .update(`${input.jobId}:${input.type}:${input.localFilePath}:${input.description ?? ""}:${Date.now()}`)
    .digest("hex");
}

async function route(request: IncomingMessage, response: ServerResponse) {
  if (request.method === "OPTIONS") {
    sendJson(response, 204, {});
    return;
  }

  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  const context = { repositories };

  if (request.method === "GET" && url.pathname === "/api/state") {
    sendJson(response, 200, await loadState(context));
    return;
  }

  if (request.method === "POST" && url.pathname === "/api/jobs") {
    const input = await readJson<CreateJobInput>(request);
    sendJson(response, 201, await createJob(input, context));
    return;
  }

  const evidenceMatch = url.pathname.match(/^\/api\/jobs\/([^/]+)\/evidence$/);
  if (request.method === "POST" && evidenceMatch) {
    const body = await readJson<Omit<CreateEvidenceInput, "jobId" | "sha256Hash"> & { fileName?: string }>(request);
    const fileName = body.fileName?.trim() || `${evidenceMatch[1]}_${body.type}.jpg`;
    const input = {
      jobId: evidenceMatch[1],
      uploadedBy: body.uploadedBy,
      type: body.type,
      localFilePath: `uploads/${fileName}`,
      publicFileUrl: `/uploads/${fileName}`,
      description: body.description,
      sha256Hash: evidenceHash({
        jobId: evidenceMatch[1],
        type: body.type,
        localFilePath: `uploads/${fileName}`,
        description: body.description,
      }),
    };

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
    const message = error instanceof Error ? error.message : "Error desconocido.";
    sendJson(response, 500, { error: message });
  });
});

server.listen(port, "127.0.0.1", () => {
  console.log(`API local lista en http://127.0.0.1:${port}`);
});

process.on("SIGINT", () => {
  repositories.close?.();
  server.close(() => process.exit(0));
});
