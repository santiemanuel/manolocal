import { openDatabase } from "../../db/connection.ts";
import type { RepositorySet } from "../ports.ts";
import { SqliteArkivEventsRepository } from "./arkiv-events.repository.ts";
import { SqliteEvidenceRepository } from "./evidence.repository.ts";
import { SqliteJobsRepository } from "./jobs.repository.ts";
import { SqliteServicesRepository } from "./services.repository.ts";

export type SqliteRepositorySet = RepositorySet & {
  close(): void;
};

export function createSqliteRepositories(): SqliteRepositorySet {
  const db = openDatabase();

  return {
    jobs: new SqliteJobsRepository(db),
    evidence: new SqliteEvidenceRepository(db),
    services: new SqliteServicesRepository(db),
    arkivEvents: new SqliteArkivEventsRepository(db),
    close() {
      db.close();
    },
  };
}
