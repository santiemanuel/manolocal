import type { RepositorySet } from "./ports.ts";
import { createDirectusRepositories, type DirectusRepositorySet } from "./directus/db.ts";
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
    return createDirectusRepositories();
  }

  throw new Error(`Unsupported DATA_ADAPTER: ${adapter}`);
}

export type { SqliteRepositorySet };
export type { DirectusRepositorySet };
export type * from "./ports.ts";
