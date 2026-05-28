import { randomUUID } from "node:crypto";
import type { openDatabase } from "../../db/connection.ts";
import type { ArkivEvent, ArkivEventsRepository, CreateArkivEventInput } from "../ports.ts";

type DatabaseConnection = ReturnType<typeof openDatabase>;

type ArkivEventRow = {
  id: string;
  local_subject_type: string;
  local_subject_id: string;
  event_type: string;
  entity_key: string;
  tx_hash: string;
  payload_json: string;
  attributes_json: string;
  created_at: string;
};

function toArkivEvent(row: ArkivEventRow): ArkivEvent {
  return {
    id: row.id,
    localSubjectType: row.local_subject_type,
    localSubjectId: row.local_subject_id,
    eventType: row.event_type,
    entityKey: row.entity_key,
    txHash: row.tx_hash,
    payloadJson: row.payload_json,
    attributesJson: row.attributes_json,
    createdAt: row.created_at,
  };
}

export class SqliteArkivEventsRepository implements ArkivEventsRepository {
  constructor(private readonly db: DatabaseConnection) {}

  async create(input: CreateArkivEventInput): Promise<ArkivEvent> {
    const id = randomUUID();
    const now = new Date().toISOString();

    this.db
      .prepare(
        `
          INSERT INTO arkiv_events (
            id,
            local_subject_type,
            local_subject_id,
            event_type,
            entity_key,
            tx_hash,
            payload_json,
            attributes_json,
            created_at
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        id,
        input.localSubjectType,
        input.localSubjectId,
        input.eventType,
        input.entityKey,
        input.txHash,
        input.payloadJson,
        input.attributesJson,
        now,
      );

    const event = this.db.prepare("SELECT * FROM arkiv_events WHERE id = ?").get(id) as
      | ArkivEventRow
      | undefined;

    if (!event) {
      throw new Error(`Arkiv event ${id} was not created`);
    }

    return toArkivEvent(event);
  }

  async list(): Promise<ArkivEvent[]> {
    const rows = this.db
      .prepare("SELECT * FROM arkiv_events ORDER BY created_at DESC, id ASC")
      .all() as ArkivEventRow[];

    return rows.map(toArkivEvent);
  }

  async listBySubject(localSubjectType: string, localSubjectId: string): Promise<ArkivEvent[]> {
    const rows = this.db
      .prepare(
        `
          SELECT * FROM arkiv_events
          WHERE local_subject_type = ? AND local_subject_id = ?
          ORDER BY created_at ASC, id ASC
        `,
      )
      .all(localSubjectType, localSubjectId) as ArkivEventRow[];

    return rows.map(toArkivEvent);
  }
}
