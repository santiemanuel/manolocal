import { openDatabase } from "../../db/connection.ts";
import type { RepositorySet } from "../ports.ts";
import { SqliteArkivEventsRepository } from "./arkiv-events.repository.ts";
import { SqliteEvidenceRepository } from "./evidence.repository.ts";
import { SqliteJobsRepository } from "./jobs.repository.ts";
import { SqliteReviewsRepository } from "./reviews.repository.ts";
import { SqliteServicesRepository } from "./services.repository.ts";
import { SqliteUsersRepository } from "./users.repository.ts";

export type SqliteRepositorySet = RepositorySet & {
  close(): void;
};

export function createSqliteRepositories(): SqliteRepositorySet {
  const db = openDatabase();

  return {
    jobs: new SqliteJobsRepository(db),
    evidence: new SqliteEvidenceRepository(db),
    services: new SqliteServicesRepository(db),
    users: new SqliteUsersRepository(db),
    reviews: new SqliteReviewsRepository(db),
    arkivEvents: new SqliteArkivEventsRepository(db),
    close() {
      db.close();
    },
  };
}
