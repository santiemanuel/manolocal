import { randomUUID } from "node:crypto";
import type { CreateJobInput, Job, JobsRepository, JobStatus } from "../ports.ts";
import { DirectusClient } from "./client.ts";
import type { DirectusJob } from "./mappers.ts";
import { toJob } from "./mappers.ts";

export class DirectusJobsRepository implements JobsRepository {
  constructor(private readonly client: DirectusClient) {}

  async create(input: CreateJobInput): Promise<Job> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const row = await this.client.create<DirectusJob>("jobs_ml", {
      id,
      client_id: input.clientId,
      provider_id: input.providerId ?? null,
      service_id: input.serviceId,
      title: input.title,
      description: input.description,
      status: "requested",
      address_area: input.addressArea ?? null,
      scheduled_date: input.scheduledDate ?? null,
      created_at: now,
      updated_at: now,
    });

    return toJob(row);
  }

  async findById(id: string): Promise<Job | null> {
    const row = await this.client.item<DirectusJob>("jobs_ml", id);
    return row ? toJob(row) : null;
  }

  async list(): Promise<Job[]> {
    const rows = await this.client.list<DirectusJob>("jobs_ml", { limit: -1, sort: "-created_at,id" });
    return rows.map(toJob);
  }

  async updateStatus(id: string, status: JobStatus): Promise<void> {
    await this.client.update<DirectusJob>("jobs_ml", id, {
      status,
      updated_at: new Date().toISOString(),
    });
  }

  async attachCreatedArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void> {
    await this.client.update<DirectusJob>("jobs_ml", id, {
      arkiv_entity_key_created: event.entityKey,
      arkiv_tx_hash_created: event.txHash,
      updated_at: new Date().toISOString(),
    });
  }
}
