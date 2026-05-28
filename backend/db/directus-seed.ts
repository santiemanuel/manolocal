import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "dotenv";
import { createArkivWalletClient } from "../src/arkiv/client.ts";
import {
  createAIReviewGeneratedEntity,
  createEvidenceUploadedEntity,
  createJobCompletedEntity,
  createJobCreatedEntity,
} from "../src/arkiv/event-publishers.ts";
import { createDirectusRepositories } from "../src/repositories/directus/db.ts";
import { DirectusClient, type DirectusFile } from "../src/repositories/directus/client.ts";
import type { ArkivEvent, Job, JobEvidence } from "../src/repositories/ports.ts";

config({ quiet: true });

const client = new DirectusClient();
const now = "2026-05-28T12:00:00.000Z";
const seedFilePrefix = "ml_seed_";
const arkivEntityExplorerUrl = "https://data.arkiv.network";
const arkivBlockExplorerUrl = "https://explorer.braga.hoodi.arkiv.network";

type Row = Record<string, unknown> & { id: string };
type DirectusListResponse<T> = { data: T[] };
type EvidenceSeed = Row & {
  asset_file_name: string;
};

const users: Row[] = [
  { id: "client_001", name: "Sofia Ramirez", role: "client", avatar_url: null, city: "Buenos Aires", rating: 4.9 },
  { id: "client_002", name: "Mateo Fernandez", role: "client", avatar_url: null, city: "Cordoba", rating: 4.7 },
  { id: "client_003", name: "Valentina Torres", role: "client", avatar_url: null, city: "Rosario", rating: 4.8 },
  { id: "provider_001", name: "Martin Acosta", role: "provider", avatar_url: null, city: "Buenos Aires", rating: 4.9 },
  { id: "provider_002", name: "Camila Ruiz", role: "provider", avatar_url: null, city: "Buenos Aires", rating: 4.8 },
  { id: "provider_003", name: "Nicolas Pereyra", role: "provider", avatar_url: null, city: "La Plata", rating: 4.9 },
  { id: "provider_004", name: "Lucia Benitez", role: "provider", avatar_url: null, city: "Cordoba", rating: 4.6 },
  { id: "provider_005", name: "Diego Sosa", role: "provider", avatar_url: null, city: "Rosario", rating: 4.7 },
  { id: "admin_001", name: "Operador Servicios Verificables", role: "admin", avatar_url: null, city: "Buenos Aires", rating: 0 },
];

const services: Row[] = [
  {
    id: "service_plumbing",
    name: "Plomeria",
    category: "home_repair",
    description: "Reparaciones de perdidas, griferia, desagues y conexiones de agua.",
    base_price: 18000,
    icon: "wrench",
  },
  {
    id: "service_gardening",
    name: "Jardineria",
    category: "outdoor",
    description: "Corte de cesped, mantenimiento de jardines y limpieza de patios.",
    base_price: 15000,
    icon: "sprout",
  },
  {
    id: "service_electricity",
    name: "Electricidad",
    category: "home_repair",
    description: "Instalacion y reparacion de tomas, luminarias y tableros simples.",
    base_price: 22000,
    icon: "bolt",
  },
  {
    id: "service_cleaning",
    name: "Limpieza",
    category: "home_care",
    description: "Limpieza profunda para hogares, oficinas y espacios comunes.",
    base_price: 20000,
    icon: "sparkles",
  },
  {
    id: "service_repairs",
    name: "Reparaciones",
    category: "maintenance",
    description: "Arreglos generales, ajustes, colocaciones y mantenimiento menor.",
    base_price: 17000,
    icon: "hammer",
  },
  {
    id: "service_general_maintenance",
    name: "Mantenimiento general",
    category: "maintenance",
    description: "Visitas de diagnostico y mantenimiento preventivo del hogar.",
    base_price: 16000,
    icon: "settings",
  },
];

const profiles: Row[] = [
  {
    id: "profile_provider_001",
    user_id: "provider_001",
    bio: "Plomero matriculado con experiencia en reparaciones residenciales.",
    service_categories: ["plomeria", "reparaciones"],
    experience_years: 8,
    verified_jobs_count: 42,
    rating_average: 4.9,
  },
  {
    id: "profile_provider_002",
    user_id: "provider_002",
    bio: "Especialista en jardineria urbana y mantenimiento de patios.",
    service_categories: ["jardineria", "mantenimiento"],
    experience_years: 5,
    verified_jobs_count: 31,
    rating_average: 4.8,
  },
  {
    id: "profile_provider_003",
    user_id: "provider_003",
    bio: "Tecnico electricista para instalaciones domesticas y mejoras simples.",
    service_categories: ["electricidad", "mantenimiento"],
    experience_years: 7,
    verified_jobs_count: 37,
    rating_average: 4.9,
  },
  {
    id: "profile_provider_004",
    user_id: "provider_004",
    bio: "Equipo de limpieza profunda con foco en entregas verificables.",
    service_categories: ["limpieza"],
    experience_years: 4,
    verified_jobs_count: 22,
    rating_average: 4.6,
  },
  {
    id: "profile_provider_005",
    user_id: "provider_005",
    bio: "Mantenimiento general, colocaciones y reparaciones rapidas.",
    service_categories: ["reparaciones", "mantenimiento"],
    experience_years: 6,
    verified_jobs_count: 26,
    rating_average: 4.7,
  },
];

const jobs: Row[] = [
  {
    id: "job_001",
    client_id: "client_001",
    provider_id: "provider_001",
    service_id: "service_plumbing",
    title: "Perdida bajo cocina",
    description: "Reparacion de perdida de agua debajo de la cocina.",
    status: "completed",
    address_area: "Palermo",
    scheduled_date: "2026-05-29T10:00:00.000Z",
    created_at: now,
    updated_at: "2026-05-28T13:00:00.000Z",
    arkiv_entity_key_created: null,
    arkiv_tx_hash_created: null,
  },
  {
    id: "job_002",
    client_id: "client_002",
    provider_id: "provider_002",
    service_id: "service_gardening",
    title: "Corte de cesped",
    description: "Corte de cesped y limpieza de patio posterior.",
    status: "completed",
    address_area: "Nueva Cordoba",
    scheduled_date: "2026-05-30T09:00:00.000Z",
    created_at: now,
    updated_at: "2026-05-28T13:10:00.000Z",
    arkiv_entity_key_created: null,
    arkiv_tx_hash_created: null,
  },
  {
    id: "job_003",
    client_id: "client_003",
    provider_id: "provider_003",
    service_id: "service_electricity",
    title: "Cambio de toma",
    description: "Reemplazo de toma electrica con evidencia de avance y cierre.",
    status: "completed",
    address_area: "Centro",
    scheduled_date: "2026-06-01T15:00:00.000Z",
    created_at: now,
    updated_at: "2026-05-28T13:15:00.000Z",
    arkiv_entity_key_created: null,
    arkiv_tx_hash_created: null,
  },
  {
    id: "job_004",
    client_id: "client_001",
    provider_id: "provider_004",
    service_id: "service_cleaning",
    title: "Limpieza profunda",
    description: "Limpieza profunda de departamento previo a mudanza.",
    status: "completed",
    address_area: "Recoleta",
    scheduled_date: "2026-06-02T08:30:00.000Z",
    created_at: now,
    updated_at: "2026-05-28T13:20:00.000Z",
    arkiv_entity_key_created: null,
    arkiv_tx_hash_created: null,
  },
];

const evidenceSeeds: EvidenceSeed[] = [
  evidenceSeed("evidence_001", "job_001", "provider_001", "before", "job_001_before.png", "Estado inicial de la perdida bajo la cocina.", "Se observa una perdida activa debajo de la cocina antes de la reparacion.", "valid", "before", 0.93),
  evidenceSeed("evidence_002", "job_001", "provider_001", "after", "job_001_after.png", "Reparacion terminada sin perdida visible.", "La imagen indica una reparacion finalizada y sin perdida visible.", "valid", "work_completed", 0.95),
  evidenceSeed("evidence_003", "job_002", "provider_002", "before", "job_002_before.png", "Patio posterior antes del corte de cesped.", "Se observa cesped alto y area pendiente de mantenimiento.", "valid", "before", 0.88),
  evidenceSeed("evidence_004", "job_002", "provider_002", "after", "job_002_after.png", "Patio posterior luego del corte de cesped.", "Se observa cesped recortado y el area despejada.", "valid", "work_completed", 0.91),
  evidenceSeed("evidence_005", "job_003", "provider_003", "progress", "job_003_progress.png", "Avance durante el cambio de toma.", "Se observa trabajo electrico en progreso; requiere evidencia final.", "warning", "progress", 0.79, ["trabajo_en_progreso"]),
  evidenceSeed("evidence_006", "job_003", "provider_003", "after", "job_003_after.png", "Toma reemplazada y frente colocado.", "La toma parece instalada y el area de trabajo quedo ordenada.", "valid", "work_completed", 0.87),
  evidenceSeed("evidence_007", "job_004", "provider_004", "before", "job_004_before.png", "Departamento antes de la limpieza profunda.", "Se observa espacio desordenado antes de iniciar la limpieza.", "valid", "before", 0.84),
  evidenceSeed("evidence_008", "job_004", "provider_004", "after", "job_004_after.png", "Departamento limpio y listo para entregar.", "El ambiente se observa limpio, despejado y listo para entrega.", "valid", "work_completed", 0.92),
];

const reviews: Row[] = [
  review("review_001", "job_001", "client_001", "provider_001", 5, "Trabajo terminado correctamente y con evidencia clara.", "2026-05-28T13:00:00.000Z"),
  review("review_002", "job_002", "client_002", "provider_002", 5, "El patio quedo prolijo y la evidencia muestra el cambio.", "2026-05-28T13:10:00.000Z"),
  review("review_003", "job_003", "client_003", "provider_003", 4, "Buen trabajo; la primera evidencia mostro avance y luego se completo.", "2026-05-28T13:15:00.000Z"),
  review("review_004", "job_004", "client_001", "provider_004", 5, "El departamento quedo listo para entregar.", "2026-05-28T13:20:00.000Z"),
];

const arkivEvents: Row[] = [];

function evidenceSeed(
  id: string,
  jobId: string,
  uploadedBy: string,
  type: string,
  assetFileName: string,
  description: string,
  aiSummary: string,
  aiStatus: string,
  aiClassification: string,
  aiConfidence: number,
  aiWarnings: string[] = [],
): EvidenceSeed {
  return {
    id,
    job_id: jobId,
    uploaded_by: uploadedBy,
    type,
    asset_file_name: assetFileName,
    description,
    ai_summary: aiSummary,
    ai_status: aiStatus,
    ai_classification: aiClassification,
    ai_confidence: aiConfidence,
    ai_warnings: aiWarnings,
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: `2026-05-28T12:${10 + Number(suffix(id)) * 4}:00.000Z`,
  };
}

function review(
  id: string,
  jobId: string,
  clientId: string,
  providerId: string,
  rating: number,
  comment: string,
  createdAt: string,
): Row {
  return {
    id,
    job_id: jobId,
    client_id: clientId,
    provider_id: providerId,
    rating,
    comment,
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: createdAt,
  };
}

function suffix(value: unknown): string {
  return String(value).split("_").at(-1) ?? String(value);
}

function entityExplorerUrl(entityKey: string) {
  const params = new URLSearchParams({ q: `$key = "${entityKey}"` });
  return `${arkivEntityExplorerUrl}/?${params.toString()}`;
}

function txExplorerUrl(txHash: string) {
  return `${arkivBlockExplorerUrl}/tx/${txHash}`;
}

async function requireJob(job: Job | null, id: string) {
  if (!job) {
    throw new Error(`No existe el trabajo sembrado ${id}.`);
  }

  return job;
}

async function requireEvidence(evidence: JobEvidence | null, id: string) {
  if (!evidence) {
    throw new Error(`No existe la evidencia sembrada ${id}.`);
  }

  return evidence;
}

function logArkivEvent(event: ArkivEvent) {
  console.log(`[arkiv] ${event.eventType} ${event.localSubjectId}`);
  console.log(`  entityKey: ${event.entityKey}`);
  console.log(`  entity:    ${entityExplorerUrl(event.entityKey)}`);
  console.log(`  txHash:    ${event.txHash}`);
  console.log(`  tx:        ${txExplorerUrl(event.txHash)}`);
}

async function resetCollection(collection: string) {
  const rows = await client.list<{ id: string }>(collection, { limit: -1, fields: "id" });

  for (const row of rows) {
    await client.delete(collection, row.id);
  }

  console.log(`${collection}: ${rows.length} filas eliminadas`);
}

async function deleteSeedFiles() {
  const seedFileNames = new Set(evidenceSeeds.map((item) => `${seedFilePrefix}${item.asset_file_name}`));
  const response = await client.system<DirectusListResponse<DirectusFile>>("GET", "/files", undefined, {
    limit: -1,
    fields: "id,filename_download,type",
  });
  const files = response.data.filter((file) => seedFileNames.has(file.filename_download));

  for (const file of files) {
    await client.system<null>("DELETE", `/files/${file.id}`);
  }

  console.log(`directus_files: ${files.length} assets de seed eliminados`);
}

async function createMany(collection: string, rows: Row[]) {
  for (const row of rows) {
    await client.create(collection, row);
  }

  console.log(`${collection}: ${rows.length} filas sembradas`);
}

async function buildEvidenceRows(): Promise<Row[]> {
  const rows: Row[] = [];

  for (const seed of evidenceSeeds) {
    const assetPath = resolve(process.cwd(), "db", "seed-assets", "evidence", seed.asset_file_name);
    const buffer = await readFile(assetPath);
    const filename = `${seedFilePrefix}${seed.asset_file_name}`;
    const file = await client.uploadFile({
      buffer,
      filename,
      title: `Seed evidence ${seed.id}`,
      type: "image/png",
    });
    const { asset_file_name: assetFileName, ...row } = seed;

    rows.push({
      ...(row as Row),
      file: file.id,
      local_file_path: `db/seed-assets/evidence/${assetFileName}`,
      public_file_url: client.assetUrl(file.id),
      sha256_hash: createHash("sha256").update(buffer).digest("hex"),
      ai_summary: null,
      ai_status: "pending",
    });
  }

  console.log(`directus_files: ${rows.length} evidencias PNG subidas`);
  return rows;
}

async function publishArkivFlow() {
  const repositories = createDirectusRepositories();
  const walletClient = createArkivWalletClient();
  const dependencies = {
    walletClient,
    jobsRepository: repositories.jobs,
    evidenceRepository: repositories.evidence,
    arkivEventsRepository: repositories.arkivEvents,
  };

  for (const row of jobs) {
    const jobId = String(row.id);
    let job = await requireJob(await repositories.jobs.findById(jobId), jobId);

    logArkivEvent(await createJobCreatedEntity(job, dependencies));

    const jobEvidenceSeeds = evidenceSeeds.filter((seed) => seed.job_id === jobId);
    for (const seed of jobEvidenceSeeds) {
      const evidenceId = String(seed.id);

      await repositories.jobs.updateStatus(job.id, "evidence_uploaded");
      job = await requireJob(await repositories.jobs.findById(job.id), job.id);

      const evidence = await requireEvidence(await repositories.evidence.findById(evidenceId), evidenceId);
      logArkivEvent(await createEvidenceUploadedEntity(job, evidence, dependencies));

      await repositories.evidence.attachAIReview(evidenceId, {
        summary: String(seed.ai_summary),
        status: seed.ai_status as JobEvidence["aiStatus"],
      });
      await repositories.jobs.updateStatus(job.id, "ai_reviewed");

      job = await requireJob(await repositories.jobs.findById(job.id), job.id);
      const reviewedEvidence = await requireEvidence(await repositories.evidence.findById(evidenceId), evidenceId);
      logArkivEvent(await createAIReviewGeneratedEntity(job, reviewedEvidence, dependencies));
    }

    await repositories.jobs.updateStatus(job.id, "completed");
    job = await requireJob(await repositories.jobs.findById(job.id), job.id);
    logArkivEvent(await createJobCompletedEntity(job, dependencies));
  }

  const [seededJobs, arkivEvents] = await Promise.all([repositories.jobs.list(), repositories.arkivEvents.list()]);
  const seededEvidence = (await Promise.all(seededJobs.map((job) => repositories.evidence.listByJobId(job.id)))).flat();

  console.table({
    jobs: seededJobs.length,
    evidence: seededEvidence.length,
    arkivEvents: arkivEvents.length,
  });
}

async function ensureEvidenceFileRequired() {
  try {
    await client.system("PATCH", "/fields/job_evidence_ml/file", {
      meta: { required: true },
      schema: { is_nullable: false },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "error desconocido";
    console.warn(`No se pudo ajustar job_evidence_ml.file como requerido: ${message}`);
  }
}

async function resetAppData() {
  for (const collection of [
    "arkiv_events_ml",
    "reviews_ml",
    "job_evidence_ml",
    "jobs_ml",
    "provider_profiles_ml",
    "services_ml",
    "users_ml",
  ]) {
    await resetCollection(collection);
  }

  await deleteSeedFiles();
}

await resetAppData();
await ensureEvidenceFileRequired();
await createMany("users_ml", users);
await createMany("services_ml", services);
await createMany("provider_profiles_ml", profiles);
await createMany(
  "jobs_ml",
  jobs.map((job) => ({
    ...job,
    status: "requested",
    updated_at: now,
  })),
);
await createMany("job_evidence_ml", await buildEvidenceRows());
await createMany("reviews_ml", reviews);
await createMany("arkiv_events_ml", arkivEvents);
await publishArkivFlow();

console.log("directus seed complete");
