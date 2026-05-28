import { openDatabase, resolveDatabasePath } from "../src/db/connection.ts";

const db = openDatabase();

const tables = [
  "users",
  "services",
  "provider_profiles",
  "jobs",
  "job_evidence",
  "reviews",
  "arkiv_events",
  "schema_migrations",
];

console.log(`database: ${resolveDatabasePath()}`);

for (const table of tables) {
  const row = db.prepare(`SELECT COUNT(*) AS count FROM ${table}`).get() as { count: number };
  console.log(`${table}: ${row.count}`);
}

const jobs = db
  .prepare(
    `
      SELECT jobs.id, jobs.title, jobs.status, services.name AS service, users.name AS client
      FROM jobs
      JOIN services ON services.id = jobs.service_id
      JOIN users ON users.id = jobs.client_id
      ORDER BY jobs.id
    `,
  )
  .all();

console.table(jobs);

db.close();
