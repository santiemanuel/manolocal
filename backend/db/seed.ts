import { createHash } from "node:crypto";
import { copyFile, mkdir, readFile } from "node:fs/promises";
import { basename, isAbsolute, join, resolve } from "node:path";
import { createArkivWalletClient } from "../src/arkiv/client.ts";
import {
  createAIReviewGeneratedEntity,
  createEvidenceUploadedEntity,
  createJobCompletedEntity,
  createJobCreatedEntity,
} from "../src/arkiv/event-publishers.ts";
import { openDatabase } from "../src/db/connection.ts";
import { createSqliteRepositories } from "../src/repositories/sqlite/db.ts";
import type { AiStatus, ArkivEvent, EvidenceType, Job, JobEvidence, JobStatus } from "../src/repositories/ports.ts";

const now = "2026-05-28T12:00:00.000Z";
const seedFilePrefix = "ml_seed_";
const arkivEntityExplorerUrl = "https://data.arkiv.network";
const arkivBlockExplorerUrl = "https://explorer.braga.hoodi.arkiv.network";

type Row = Record<string, string | number | null>;

type EvidenceSeed = {
  id: string;
  jobId: string;
  uploadedBy: string;
  type: EvidenceType;
  assetFileName: string;
  description: string;
  aiSummary: string;
  aiStatus: AiStatus;
  createdAt: string;
};

type JobSeed = {
  finalStatus: JobStatus;
  row: Row;
};

function uploadsDir() {
  const setting = process.env.UPLOADS_DIR?.trim() || "./uploads";
  return isAbsolute(setting) ? setting : resolve(process.cwd(), setting);
}

function entityExplorerUrl(entityKey: string) {
  const params = new URLSearchParams({ q: `$key = "${entityKey}"` });
  return `${arkivEntityExplorerUrl}/?${params.toString()}`;
}

function txExplorerUrl(txHash: string) {
  return `${arkivBlockExplorerUrl}/tx/${txHash}`;
}

function upsert(db: ReturnType<typeof openDatabase>, table: string, row: Row) {
  const keys = Object.keys(row);
  const placeholders = keys.map(() => "?").join(", ");
  const updates = keys
    .filter((key) => key !== "id")
    .map((key) => `${key} = excluded.${key}`)
    .join(", ");

  db.prepare(
    `
      INSERT INTO ${table} (${keys.join(", ")})
      VALUES (${placeholders})
      ON CONFLICT(id) DO UPDATE SET ${updates}
    `,
  ).run(...keys.map((key) => row[key]));
}

function jobSeed(
  id: string,
  clientId: string,
  providerId: string,
  serviceId: string,
  title: string,
  description: string,
  addressArea: string,
  scheduledDate: string,
): JobSeed {
  return {
    finalStatus: "completed",
    row: {
      id,
      client_id: clientId,
      provider_id: providerId,
      service_id: serviceId,
      title,
      description,
      status: "requested",
      address_area: addressArea,
      scheduled_date: scheduledDate,
      created_at: now,
      updated_at: now,
      arkiv_entity_key_created: null,
      arkiv_tx_hash_created: null,
    },
  };
}

function evidenceSeed(
  id: string,
  jobId: string,
  uploadedBy: string,
  type: EvidenceType,
  assetFileName: string,
  description: string,
  aiSummary: string,
  aiStatus: AiStatus,
): EvidenceSeed {
  return {
    id,
    jobId,
    uploadedBy,
    type,
    assetFileName,
    description,
    aiSummary,
    aiStatus,
    createdAt: `2026-05-28T12:${10 + Number(id.split("_").at(-1)) * 4}:00.000Z`,
  };
}

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
    service_categories: JSON.stringify(["plomeria", "reparaciones"]),
    experience_years: 8,
    verified_jobs_count: 42,
    rating_average: 4.9,
  },
  {
    id: "profile_provider_002",
    user_id: "provider_002",
    bio: "Especialista en jardineria urbana y mantenimiento de patios.",
    service_categories: JSON.stringify(["jardineria", "mantenimiento"]),
    experience_years: 5,
    verified_jobs_count: 31,
    rating_average: 4.8,
  },
  {
    id: "profile_provider_003",
    user_id: "provider_003",
    bio: "Tecnico electricista para instalaciones domesticas y mejoras simples.",
    service_categories: JSON.stringify(["electricidad", "mantenimiento"]),
    experience_years: 7,
    verified_jobs_count: 37,
    rating_average: 4.9,
  },
  {
    id: "profile_provider_004",
    user_id: "provider_004",
    bio: "Equipo de limpieza profunda con foco en entregas verificables.",
    service_categories: JSON.stringify(["limpieza"]),
    experience_years: 4,
    verified_jobs_count: 22,
    rating_average: 4.6,
  },
  {
    id: "profile_provider_005",
    user_id: "provider_005",
    bio: "Mantenimiento general, colocaciones y reparaciones rapidas.",
    service_categories: JSON.stringify(["reparaciones", "mantenimiento"]),
    experience_years: 6,
    verified_jobs_count: 26,
    rating_average: 4.7,
  },
];

const jobSeeds: JobSeed[] = [
  jobSeed(
    "job_001",
    "client_001",
    "provider_001",
    "service_plumbing",
    "Perdida bajo cocina",
    "Reparacion de perdida de agua debajo de la cocina.",
    "Palermo",
    "2026-05-29T10:00:00.000Z",
  ),
  jobSeed(
    "job_002",
    "client_002",
    "provider_002",
    "service_gardening",
    "Corte de cesped",
    "Corte de cesped y limpieza de patio posterior.",
    "Nueva Cordoba",
    "2026-05-30T09:00:00.000Z",
  ),
  jobSeed(
    "job_003",
    "client_003",
    "provider_003",
    "service_electricity",
    "Cambio de toma",
    "Reemplazo de toma electrica con evidencia de avance y cierre.",
    "Centro",
    "2026-06-01T15:00:00.000Z",
  ),
  jobSeed(
    "job_004",
    "client_001",
    "provider_004",
    "service_cleaning",
    "Limpieza profunda",
    "Limpieza profunda de departamento previo a mudanza.",
    "Recoleta",
    "2026-06-02T08:30:00.000Z",
  ),
];

const evidenceSeeds: EvidenceSeed[] = [
  evidenceSeed("evidence_001", "job_001", "provider_001", "before", "job_001_before.png", "Estado inicial de la perdida bajo la cocina.", "Se observa una perdida activa debajo de la cocina antes de la reparacion.", "valid"),
  evidenceSeed("evidence_002", "job_001", "provider_001", "after", "job_001_after.png", "Reparacion terminada sin perdida visible.", "La imagen indica una reparacion finalizada y sin perdida visible.", "valid"),
  evidenceSeed("evidence_003", "job_002", "provider_002", "before", "job_002_before.png", "Patio posterior antes del corte de cesped.", "Se observa cesped alto y area pendiente de mantenimiento.", "valid"),
  evidenceSeed("evidence_004", "job_002", "provider_002", "after", "job_002_after.png", "Patio posterior luego del corte de cesped.", "Se observa cesped recortado y el area despejada.", "valid"),
  evidenceSeed("evidence_005", "job_003", "provider_003", "progress", "job_003_progress.png", "Avance durante el cambio de toma.", "Se observa trabajo electrico en progreso; requiere evidencia final.", "warning"),
  evidenceSeed("evidence_006", "job_003", "provider_003", "after", "job_003_after.png", "Toma reemplazada y frente colocado.", "La toma parece instalada y el area de trabajo quedo ordenada.", "valid"),
  evidenceSeed("evidence_007", "job_004", "provider_004", "before", "job_004_before.png", "Departamento antes de la limpieza profunda.", "Se observa espacio desordenado antes de iniciar la limpieza.", "valid"),
  evidenceSeed("evidence_008", "job_004", "provider_004", "after", "job_004_after.png", "Departamento limpio y listo para entregar.", "El ambiente se observa limpio, despejado y listo para entrega.", "valid"),
];

const reviews: Row[] = [
  {
    id: "review_001",
    job_id: "job_001",
    client_id: "client_001",
    provider_id: "provider_001",
    rating: 5,
    comment: "Trabajo terminado correctamente y con evidencia clara.",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: "2026-05-28T13:00:00.000Z",
  },
  {
    id: "review_002",
    job_id: "job_002",
    client_id: "client_002",
    provider_id: "provider_002",
    rating: 5,
    comment: "El patio quedo prolijo y la evidencia muestra el cambio.",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: "2026-05-28T13:10:00.000Z",
  },
  {
    id: "review_003",
    job_id: "job_003",
    client_id: "client_003",
    provider_id: "provider_003",
    rating: 4,
    comment: "Buen trabajo; la primera evidencia mostro avance y luego se completo.",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: "2026-05-28T13:15:00.000Z",
  },
  {
    id: "review_004",
    job_id: "job_004",
    client_id: "client_001",
    provider_id: "provider_004",
    rating: 5,
    comment: "El departamento quedo listo para entregar.",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: "2026-05-28T13:20:00.000Z",
  },
];

async function buildEvidenceRows() {
  const rows: Row[] = [];
  const targetDir = uploadsDir();

  await mkdir(targetDir, { recursive: true });

  for (const seed of evidenceSeeds) {
    const sourcePath = resolve(process.cwd(), "db", "seed-assets", "evidence", seed.assetFileName);
    const buffer = await readFile(sourcePath);
    const fileName = `${seedFilePrefix}${basename(seed.assetFileName)}`;

    await copyFile(sourcePath, join(targetDir, fileName));

    rows.push({
      id: seed.id,
      job_id: seed.jobId,
      uploaded_by: seed.uploadedBy,
      type: seed.type,
      local_file_path: `uploads/${fileName}`,
      public_file_url: `/uploads/${fileName}`,
      description: seed.description,
      sha256_hash: createHash("sha256").update(buffer).digest("hex"),
      ai_summary: null,
      ai_status: "pending",
      arkiv_entity_key: null,
      arkiv_tx_hash: null,
      created_at: seed.createdAt,
    });
  }

  return rows;
}

function resetTables(db: ReturnType<typeof openDatabase>) {
  for (const table of [
    "arkiv_events",
    "reviews",
    "job_evidence",
    "jobs",
    "provider_profiles",
    "services",
    "users",
  ]) {
    db.prepare(`DELETE FROM ${table}`).run();
  }
}

function insertBaseRows(db: ReturnType<typeof openDatabase>, evidenceRows: Row[]) {
  const seed = db.transaction(() => {
    resetTables(db);
    for (const row of users) upsert(db, "users", row);
    for (const row of services) upsert(db, "services", row);
    for (const row of profiles) upsert(db, "provider_profiles", row);
    for (const seedJob of jobSeeds) upsert(db, "jobs", seedJob.row);
    for (const row of evidenceRows) upsert(db, "job_evidence", row);
    for (const row of reviews) upsert(db, "reviews", row);
  });

  seed();
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

async function publishArkivFlow() {
  const repositories = createSqliteRepositories();
  const walletClient = createArkivWalletClient();
  const dependencies = {
    walletClient,
    jobsRepository: repositories.jobs,
    evidenceRepository: repositories.evidence,
    arkivEventsRepository: repositories.arkivEvents,
  };

  try {
    for (const seedJob of jobSeeds) {
      const jobId = String(seedJob.row.id);
      let job = await requireJob(await repositories.jobs.findById(jobId), jobId);

      logArkivEvent(await createJobCreatedEntity(job, dependencies));

      const jobEvidenceSeeds = evidenceSeeds.filter((seed) => seed.jobId === jobId);
      for (const seed of jobEvidenceSeeds) {
        await repositories.jobs.updateStatus(job.id, "evidence_uploaded");
        job = await requireJob(await repositories.jobs.findById(job.id), job.id);

        const evidence = await requireEvidence(await repositories.evidence.findById(seed.id), seed.id);
        logArkivEvent(await createEvidenceUploadedEntity(job, evidence, dependencies));

        await repositories.evidence.attachAIReview(seed.id, {
          summary: seed.aiSummary,
          status: seed.aiStatus,
        });
        await repositories.jobs.updateStatus(job.id, "ai_reviewed");

        job = await requireJob(await repositories.jobs.findById(job.id), job.id);
        const reviewedEvidence = await requireEvidence(await repositories.evidence.findById(seed.id), seed.id);
        logArkivEvent(await createAIReviewGeneratedEntity(job, reviewedEvidence, dependencies));
      }

      if (seedJob.finalStatus === "completed") {
        await repositories.jobs.updateStatus(job.id, "completed");
        job = await requireJob(await repositories.jobs.findById(job.id), job.id);
        logArkivEvent(await createJobCompletedEntity(job, dependencies));
      }
    }

    const [jobs, arkivEvents] = await Promise.all([repositories.jobs.list(), repositories.arkivEvents.list()]);
    console.table({
      jobs: jobs.length,
      evidence: (await Promise.all(jobs.map((job) => repositories.evidence.listByJobId(job.id)))).flat().length,
      arkivEvents: arkivEvents.length,
    });
  } finally {
    repositories.close();
  }
}

const evidenceRows = await buildEvidenceRows();
const db = openDatabase();

try {
  insertBaseRows(db, evidenceRows);
} finally {
  db.close();
}

console.log("seed local complete: datos operativos y assets PNG reconstruidos");
console.log("publicando flujo real en Arkiv Braga...");

await publishArkivFlow();

console.log("seed complete: referencias Arkiv reales guardadas en SQLite");
