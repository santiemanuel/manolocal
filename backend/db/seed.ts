import { openDatabase } from "../src/db/connection.ts";
import { createHash } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import { isAbsolute, join, resolve } from "node:path";

const db = openDatabase();

type Row = Record<string, string | number | null>;

function upsert(table: string, row: Row) {
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

const now = "2026-05-28T12:00:00.000Z";
const uploadsDirSetting = process.env.UPLOADS_DIR?.trim() || "./uploads";
const uploadsDir = isAbsolute(uploadsDirSetting)
  ? uploadsDirSetting
  : resolve(process.cwd(), uploadsDirSetting);

function createEvidenceFile(fileName: string, content: string) {
  mkdirSync(uploadsDir, { recursive: true });

  const filePath = join(uploadsDir, fileName);
  writeFileSync(filePath, content);

  return {
    local_file_path: `uploads/${fileName}`,
    public_file_url: `/uploads/${fileName}`,
    sha256_hash: createHash("sha256").update(content).digest("hex"),
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
    verified_jobs_count: 24,
    rating_average: 4.9,
  },
  {
    id: "profile_provider_002",
    user_id: "provider_002",
    bio: "Especialista en jardineria urbana y mantenimiento de patios.",
    service_categories: JSON.stringify(["jardineria", "mantenimiento"]),
    experience_years: 5,
    verified_jobs_count: 18,
    rating_average: 4.8,
  },
  {
    id: "profile_provider_003",
    user_id: "provider_003",
    bio: "Tecnico electricista para instalaciones domesticas y mejoras simples.",
    service_categories: JSON.stringify(["electricidad", "mantenimiento"]),
    experience_years: 7,
    verified_jobs_count: 31,
    rating_average: 4.9,
  },
  {
    id: "profile_provider_004",
    user_id: "provider_004",
    bio: "Equipo de limpieza profunda con foco en entregas verificables.",
    service_categories: JSON.stringify(["limpieza"]),
    experience_years: 4,
    verified_jobs_count: 15,
    rating_average: 4.6,
  },
  {
    id: "profile_provider_005",
    user_id: "provider_005",
    bio: "Mantenimiento general, colocaciones y reparaciones rapidas.",
    service_categories: JSON.stringify(["reparaciones", "mantenimiento"]),
    experience_years: 6,
    verified_jobs_count: 22,
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
    updated_at: now,
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
    status: "ai_reviewed",
    address_area: "Nueva Cordoba",
    scheduled_date: "2026-05-30T09:00:00.000Z",
    created_at: now,
    updated_at: now,
    arkiv_entity_key_created: null,
    arkiv_tx_hash_created: null,
  },
  {
    id: "job_003",
    client_id: "client_003",
    provider_id: "provider_003",
    service_id: "service_electricity",
    title: "Cambio de toma",
    description: "Reemplazo de toma electrica con evidencia de avance.",
    status: "in_progress",
    address_area: "Centro",
    scheduled_date: "2026-06-01T15:00:00.000Z",
    created_at: now,
    updated_at: now,
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
    updated_at: now,
    arkiv_entity_key_created: null,
    arkiv_tx_hash_created: null,
  },
];

const evidence: Row[] = [
  {
    id: "evidence_001",
    job_id: "job_001",
    uploaded_by: "provider_001",
    type: "before",
    ...createEvidenceFile(
      "job_001_before.txt",
      "Evidencia inicial: humedad visible debajo de la cocina antes de la reparacion.",
    ),
    description: "Estado inicial de la perdida bajo la cocina.",
    ai_summary: "Se observa humedad debajo de la cocina antes de la reparacion.",
    ai_status: "valid",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: now,
  },
  {
    id: "evidence_002",
    job_id: "job_001",
    uploaded_by: "provider_001",
    type: "after",
    ...createEvidenceFile(
      "job_001_after.txt",
      "Evidencia final: reparacion terminada sin perdida visible bajo la cocina.",
    ),
    description: "Reparacion terminada sin perdida visible.",
    ai_summary: "La imagen indica una reparacion finalizada y sin perdida visible.",
    ai_status: "valid",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: now,
  },
  {
    id: "evidence_003",
    job_id: "job_002",
    uploaded_by: "provider_002",
    type: "after",
    ...createEvidenceFile(
      "job_002_after.txt",
      "Evidencia final: patio posterior con cesped recortado y zona despejada.",
    ),
    description: "Patio posterior luego del corte de cesped.",
    ai_summary: "Se observa cesped recortado y el area despejada.",
    ai_status: "valid",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: now,
  },
  {
    id: "evidence_004",
    job_id: "job_003",
    uploaded_by: "provider_003",
    type: "progress",
    ...createEvidenceFile(
      "job_003_progress.txt",
      "Evidencia de avance: toma electrica abierta durante el reemplazo.",
    ),
    description: "Avance durante el cambio de toma.",
    ai_summary: "Se observa trabajo electrico en progreso; falta evidencia final.",
    ai_status: "warning",
    arkiv_entity_key: null,
    arkiv_tx_hash: null,
    created_at: now,
  },
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
    created_at: now,
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
    created_at: now,
  },
];

const seed = db.transaction(() => {
  for (const row of users) upsert("users", row);
  for (const row of services) upsert("services", row);
  for (const row of profiles) upsert("provider_profiles", row);
  for (const row of jobs) upsert("jobs", row);
  for (const row of evidence) upsert("job_evidence", row);
  for (const row of reviews) upsert("reviews", row);
});

seed();

console.log("seed complete");
console.table({
  users: db.prepare("SELECT COUNT(*) AS count FROM users").get(),
  services: db.prepare("SELECT COUNT(*) AS count FROM services").get(),
  provider_profiles: db.prepare("SELECT COUNT(*) AS count FROM provider_profiles").get(),
  jobs: db.prepare("SELECT COUNT(*) AS count FROM jobs").get(),
  job_evidence: db.prepare("SELECT COUNT(*) AS count FROM job_evidence").get(),
  reviews: db.prepare("SELECT COUNT(*) AS count FROM reviews").get(),
});

db.close();
