import { randomUUID } from "node:crypto";
import { basename } from "node:path";
import type { AiStatus, CreateEvidenceInput, EvidenceRepository, JobEvidence } from "../ports.ts";
import { DirectusClient } from "./client.ts";
import type { DirectusEvidence } from "./mappers.ts";
import { toEvidence } from "./mappers.ts";

export class DirectusEvidenceRepository implements EvidenceRepository {
  constructor(private readonly client: DirectusClient) {}

  async create(input: CreateEvidenceInput): Promise<JobEvidence> {
    const id = randomUUID();
    const now = new Date().toISOString();
    const fileName = input.fileName?.trim() || basename(input.localFilePath);

    if (!input.fileBuffer) {
      throw new Error("Directus requiere el binario de la evidencia para subirlo a Media Library.");
    }

    const file = await this.client.uploadFile({
      buffer: input.fileBuffer,
      filename: fileName,
      title: `Evidence ${id}`,
      type: input.contentType ?? "application/octet-stream",
    });
    const row = await this.client.create<DirectusEvidence>("job_evidence_ml", {
      id,
      job_id: input.jobId,
      uploaded_by: input.uploadedBy,
      type: input.type,
      file: file.id,
      local_file_path: input.localFilePath,
      public_file_url: this.client.assetUrl(file.id),
      description: input.description ?? null,
      sha256_hash: input.sha256Hash,
      ai_status: "pending",
      created_at: now,
    });

    return toEvidence(row, (fileId) => this.client.assetUrl(fileId));
  }

  async findById(id: string): Promise<JobEvidence | null> {
    const row = await this.client.item<DirectusEvidence>("job_evidence_ml", id);
    return row ? toEvidence(row, (fileId) => this.client.assetUrl(fileId)) : null;
  }

  async listByJobId(jobId: string): Promise<JobEvidence[]> {
    const rows = await this.client.list<DirectusEvidence>("job_evidence_ml", {
      limit: -1,
      fields: "*,file",
      "filter[job_id][_eq]": jobId,
      sort: "created_at,id",
    });
    return rows.map((row) => toEvidence(row, (fileId) => this.client.assetUrl(fileId)));
  }

  async attachArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void> {
    await this.client.update<DirectusEvidence>("job_evidence_ml", id, {
      arkiv_entity_key: event.entityKey,
      arkiv_tx_hash: event.txHash,
    });
  }

  async attachAIReview(id: string, review: { summary: string; status: AiStatus }): Promise<void> {
    await this.client.update<DirectusEvidence>("job_evidence_ml", id, {
      ai_summary: review.summary,
      ai_status: review.status,
    });
  }
}
