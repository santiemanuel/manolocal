import { randomUUID } from "node:crypto";
import type { openDatabase } from "../../db/connection.ts";
import type { CreateJobInput, Job, JobsRepository, JobStatus } from "../ports.ts";

type DatabaseConnection = ReturnType<typeof openDatabase>;

type JobRow = {
  id: string;
  client_id: string;
  provider_id: string | null;
  service_id: string;
  title: string;
  description: string;
  status: JobStatus;
  address_area: string | null;
  scheduled_date: string | null;
  created_at: string;
  updated_at: string;
  arkiv_entity_key_created: string | null;
  arkiv_tx_hash_created: string | null;
};

function toJob(row: JobRow): Job {
  return {
    id: row.id,
    clientId: row.client_id,
    providerId: row.provider_id,
    serviceId: row.service_id,
    title: row.title,
    description: row.description,
    status: row.status,
    addressArea: row.address_area,
    scheduledDate: row.scheduled_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    arkivEntityKeyCreated: row.arkiv_entity_key_created,
    arkivTxHashCreated: row.arkiv_tx_hash_created,
  };
}

export class SqliteJobsRepository implements JobsRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async create(input: CreateJobInput): Promise<Job> {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
          INSERT INTO jobs (
            id,
            client_id,
            provider_id,
            service_id,
            title,
            description,
            status,
            address_area,
            scheduled_date,
            created_at,
            updated_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        id,
        input.clientId,
        input.providerId ?? null,
        input.serviceId,
        input.title,
        input.description,
        "requested",
        input.addressArea ?? null,
        input.scheduledDate ?? null,
        now,
        now,
      );

    const job = await this.findById(id);
    if (!job) {
      throw new Error(`Job ${id} was not created`);
    }

    return job;
  }

  async findById(id: string): Promise<Job | null> {
    const row = this.db.prepare("SELECT * FROM jobs WHERE id = ?").get(id) as JobRow | undefined;
    return row ? toJob(row) : null;
  }

  async list(): Promise<Job[]> {
    const rows = this.db.prepare("SELECT * FROM jobs ORDER BY created_at DESC, id ASC").all() as JobRow[];
    return rows.map(toJob);
  }

  async updateStatus(id: string, status: JobStatus): Promise<void> {
    this.db
      .prepare("UPDATE jobs SET status = ?, updated_at = ? WHERE id = ?")
      .run(status, new Date().toISOString(), id);
  }

  async attachCreatedArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void> {
    this.db
      .prepare(
        `
          UPDATE jobs
          SET arkiv_entity_key_created = ?, arkiv_tx_hash_created = ?, updated_at = ?
          WHERE id = ?
        `,
      )
      .run(event.entityKey, event.txHash, new Date().toISOString(), id);
  }
}
