import { randomUUID } from "node:crypto";
import type { ArkivEvent, ArkivEventsRepository, CreateArkivEventInput } from "../ports.ts";
import { DirectusClient } from "./client.ts";
import type { DirectusArkivEvent } from "./mappers.ts";
import { parseJson, toArkivEvent } from "./mappers.ts";

export class DirectusArkivEventsRepository implements ArkivEventsRepository {
  constructor(private readonly client: DirectusClient) {}

  async create(input: CreateArkivEventInput): Promise<ArkivEvent> {
    const id = randomUUID();
    const row = await this.client.create<DirectusArkivEvent>("arkiv_events_ml", {
      id,
      local_subject_type: input.localSubjectType,
      local_subject_id: input.localSubjectId,
      event_type: input.eventType,
      entity_key: input.entityKey,
      tx_hash: input.txHash,
      payload_json: parseJson(input.payloadJson),
      attributes_json: parseJson(input.attributesJson),
      created_at: new Date().toISOString(),
    });

    return toArkivEvent(row);
  }

  async list(): Promise<ArkivEvent[]> {
    const rows = await this.client.list<DirectusArkivEvent>("arkiv_events_ml", { limit: -1, sort: "-created_at,id" });
    return rows.map(toArkivEvent);
  }

  async listBySubject(localSubjectType: string, localSubjectId: string): Promise<ArkivEvent[]> {
    const rows = await this.client.list<DirectusArkivEvent>("arkiv_events_ml", {
      limit: -1,
      "filter[local_subject_type][_eq]": localSubjectType,
      "filter[local_subject_id][_eq]": localSubjectId,
      sort: "created_at,id",
    });

    return rows.map(toArkivEvent);
  }
}
