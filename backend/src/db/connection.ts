import Database from "better-sqlite3";
import { config } from "dotenv";
import { mkdirSync } from "node:fs";
import { dirname, isAbsolute, resolve } from "node:path";

config({ quiet: true });

export function resolveDatabasePath() {
  const databaseUrl = process.env.DATABASE_URL?.trim() || "./data/app.db";
  return isAbsolute(databaseUrl) ? databaseUrl : resolve(process.cwd(), databaseUrl);
}

export function openDatabase() {
  const databasePath = resolveDatabasePath();
  mkdirSync(dirname(databasePath), { recursive: true });

  const db = new Database(databasePath);
  db.pragma("foreign_keys = ON");
  db.pragma("journal_mode = WAL");

  return db;
}
