import { openDatabase, resolveDatabasePath } from "../src/db/connection.ts";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";

const migrationsDir = join(process.cwd(), "db", "migrations");
const databasePath = resolveDatabasePath();

mkdirSync(dirname(databasePath), { recursive: true });

const db = openDatabase();

db.exec(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL
  );
`);

const applied = new Set(
  db
    .prepare("SELECT id FROM schema_migrations")
    .all()
    .map((row) => (row as { id: string }).id),
);

const migrations = readdirSync(migrationsDir)
  .filter((file) => file.endsWith(".sql"))
  .sort();

for (const migration of migrations) {
  if (applied.has(migration)) {
    console.log(`skip ${migration}`);
    continue;
  }

  const sql = readFileSync(join(migrationsDir, migration), "utf8");

  const applyMigration = db.transaction(() => {
    db.exec(sql);
    db.prepare("INSERT INTO schema_migrations (id, applied_at) VALUES (?, ?)").run(
      migration,
      new Date().toISOString(),
    );
  });

  applyMigration();
  console.log(`applied ${migration}`);
}

console.log(`database ready: ${databasePath}`);

db.close();
