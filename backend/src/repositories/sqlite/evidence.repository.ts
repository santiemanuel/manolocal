import { randomUUID } from "node:crypto";
import type { openDatabase } from "../../db/connection.ts";
import type {
  AiStatus,
  CreateEvidenceInput,
  EvidenceRepository,
  JobEvidence,
} from "../ports.ts";

type DatabaseConnection = ReturnType<typeof openDatabase>;

type EvidenceRow = {
  id: string;
  job_id: string;
  uploaded_by: string;
  type: JobEvidence["type"];
  local_file_path: string;
  public_file_url: string | null;
  description: string | null;
  sha256_hash: string;
  ai_summary: string | null;
  ai_status: AiStatus;
  arkiv_entity_key: string | null;
  arkiv_tx_hash: string | null;
  created_at: string;
};

function toEvidence(row: EvidenceRow): JobEvidence {
  return {
    id: row.id,
    jobId: row.job_id,
    uploadedBy: row.uploaded_by,
    type: row.type,
    localFilePath: row.local_file_path,
    publicFileUrl: row.public_file_url,
    description: row.description,
    sha256Hash: row.sha256_hash,
    aiSummary: row.ai_summary,
    aiStatus: row.ai_status,
    arkivEntityKey: row.arkiv_entity_key,
    arkivTxHash: row.arkiv_tx_hash,
    createdAt: row.created_at,
  };
}

export class SqliteEvidenceRepository implements EvidenceRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async create(input: CreateEvidenceInput): Promise<JobEvidence> {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
          INSERT INTO job_evidence (
            id,
            job_id,
            uploaded_by,
            type,
            local_file_path,
            public_file_url,
            description,
            sha256_hash,
            ai_status,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        id,
        input.jobId,
        input.uploadedBy,
        input.type,
        input.localFilePath,
        input.publicFileUrl ?? null,
        input.description ?? null,
        input.sha256Hash,
        "pending",
        now,
      );

    const evidence = await this.findById(id);
    if (!evidence) {
      throw new Error(`Evidence ${id} was not created`);
    }

    return evidence;
  }

  async findById(id: string): Promise<JobEvidence | null> {
    const row = this.db.prepare("SELECT * FROM job_evidence WHERE id = ?").get(id) as EvidenceRow | undefined;
    return row ? toEvidence(row) : null;
  }

  async listByJobId(jobId: string): Promise<JobEvidence[]> {
    const rows = this.db
      .prepare("SELECT * FROM job_evidence WHERE job_id = ? ORDER BY created_at ASC, id ASC")
      .all(jobId) as EvidenceRow[];

    return rows.map(toEvidence);
  }

  async attachArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void> {
    this.db
      .prepare("UPDATE job_evidence SET arkiv_entity_key = ?, arkiv_tx_hash = ? WHERE id = ?")
      .run(event.entityKey, event.txHash, id);
  }

  async attachAIReview(id: string, review: { summary: string; status: AiStatus }): Promise<void> {
    this.db
      .prepare("UPDATE job_evidence SET ai_summary = ?, ai_status = ? WHERE id = ?")
      .run(review.summary, review.status, id);
  }
}
