import type { RepositorySet } from "./ports.ts";
import { createSqliteRepositories, type SqliteRepositorySet } from "./sqlite/db.ts";

export type AppRepositorySet = RepositorySet & {
  close?(): void;
};

export function createRepositories(): AppRepositorySet {
  const adapter = process.env.DATA_ADAPTER?.trim().toLowerCase() || "sqlite";

  if (adapter === "sqlite") {
    return createSqliteRepositories();
  }

  if (adapter === "directus") {
    throw new Error("DATA_ADAPTER=directus is reserved for the future Directus adapter.");
  }

  throw new Error(`Unsupported DATA_ADAPTER: ${adapter}`);
}

export type { SqliteRepositorySet };
export type * from "./ports.ts";
