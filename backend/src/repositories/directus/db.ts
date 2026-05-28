import type { RepositorySet } from "../ports.ts";
import { DirectusArkivEventsRepository } from "./arkiv-events.repository.ts";
import { DirectusClient } from "./client.ts";
import { DirectusEvidenceRepository } from "./evidence.repository.ts";
import { DirectusJobsRepository } from "./jobs.repository.ts";
import { DirectusReviewsRepository } from "./reviews.repository.ts";
import { DirectusServicesRepository } from "./services.repository.ts";
import { DirectusUsersRepository } from "./users.repository.ts";

export type DirectusRepositorySet = RepositorySet;

export function createDirectusRepositories(): DirectusRepositorySet {
  const client = new DirectusClient();

  return {
    jobs: new DirectusJobsRepository(client),
    evidence: new DirectusEvidenceRepository(client),
    services: new DirectusServicesRepository(client),
    users: new DirectusUsersRepository(client),
    reviews: new DirectusReviewsRepository(client),
    arkivEvents: new DirectusArkivEventsRepository(client),
  };
}
