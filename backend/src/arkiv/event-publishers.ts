import { ExpirationTime, jsonToPayload } from "@arkiv-network/sdk/utils";
import { ARKIV_COMMON_ATTRIBUTES } from "./config.ts";
import type { ArkivWalletClient } from "./client.ts";
import type {
  ArkivAttribute,
  ArkivEvent,
  ArkivEventsRepository,
  EvidenceRepository,
  Job,
  JobEvidence,
  JobsRepository,
} from "../repositories/ports.ts";

const contentType = "application/json";
const expiresIn = ExpirationTime.fromDays(30);

type PublishDependencies = {
  walletClient: ArkivWalletClient;
  jobsRepository: JobsRepository;
  evidenceRepository: EvidenceRepository;
  arkivEventsRepository: ArkivEventsRepository;
};

type EventSubject = {
  localSubjectType: "job" | "evidence";
  localSubjectId: string;
  eventType: "job_created" | "evidence_uploaded" | "ai_review_generated" | "job_completed";
};

type PublicationInput = EventSubject & {
  payload: Record<string, unknown>;
  attributes: ArkivAttribute[];
};

async function publishAndRecord(
  input: PublicationInput,
  dependencies: PublishDependencies,
): Promise<ArkivEvent> {
  const { entityKey, txHash } = await dependencies.walletClient.createEntity({
    payload: jsonToPayload(input.payload),
    contentType,
    attributes: input.attributes,
    expiresIn,
  });

  return dependencies.arkivEventsRepository.create({
    localSubjectType: input.localSubjectType,
    localSubjectId: input.localSubjectId,
    eventType: input.eventType,
    entityKey,
    txHash,
    payloadJson: JSON.stringify(input.payload),
    attributesJson: JSON.stringify(input.attributes),
  });
}

function basePayload(eventType: EventSubject["eventType"]) {
  return {
    app: "servicios-verificables",
    track: "arkiv",
    network: "braga",
    eventType,
    publishedAt: new Date().toISOString(),
  };
}

function baseAttributes(eventType: EventSubject["eventType"], localSubjectType: EventSubject["localSubjectType"], localSubjectId: string) {
  return [
    ...ARKIV_COMMON_ATTRIBUTES,
    { key: "entityType", value: eventType },
    { key: "eventType", value: eventType },
    { key: "localSubjectType", value: localSubjectType },
    { key: "localSubjectId", value: localSubjectId },
    { key: "publishedAtMs", value: Date.now() },
  ];
}

export async function createJobCreatedEntity(
  job: Job,
  dependencies: PublishDependencies,
): Promise<ArkivEvent> {
  const eventType = "job_created";
  const payload = {
    ...basePayload(eventType),
    job: {
      id: job.id,
      clientId: job.clientId,
      providerId: job.providerId,
      serviceId: job.serviceId,
      title: job.title,
      description: job.description,
      status: job.status,
      addressArea: job.addressArea,
      scheduledDate: job.scheduledDate,
      createdAt: job.createdAt,
    },
  };

  const event = await publishAndRecord(
    {
      localSubjectType: "job",
      localSubjectId: job.id,
      eventType,
      payload,
      attributes: [
        ...baseAttributes(eventType, "job", job.id),
        { key: "jobId", value: job.id },
        { key: "clientId", value: job.clientId },
        { key: "providerId", value: job.providerId ?? "unassigned" },
        { key: "serviceId", value: job.serviceId },
        { key: "status", value: job.status },
      ],
    },
    dependencies,
  );

  await dependencies.jobsRepository.attachCreatedArkivEvent(job.id, {
    entityKey: event.entityKey,
    txHash: event.txHash,
  });

  return event;
}

export async function createEvidenceUploadedEntity(
  job: Job,
  evidence: JobEvidence,
  dependencies: PublishDependencies,
): Promise<ArkivEvent> {
  const eventType = "evidence_uploaded";
  const payload = {
    ...basePayload(eventType),
    job: {
      id: job.id,
      status: job.status,
      serviceId: job.serviceId,
      providerId: job.providerId,
    },
    evidence: {
      id: evidence.id,
      uploadedBy: evidence.uploadedBy,
      type: evidence.type,
      localFilePath: evidence.localFilePath,
      publicFileUrl: evidence.publicFileUrl,
      description: evidence.description,
      sha256Hash: evidence.sha256Hash,
      createdAt: evidence.createdAt,
    },
  };

  const event = await publishAndRecord(
    {
      localSubjectType: "evidence",
      localSubjectId: evidence.id,
      eventType,
      payload,
      attributes: [
        ...baseAttributes(eventType, "evidence", evidence.id),
        { key: "jobId", value: job.id },
        { key: "evidenceId", value: evidence.id },
        { key: "evidenceType", value: evidence.type },
        { key: "uploadedBy", value: evidence.uploadedBy },
        { key: "sha256Hash", value: evidence.sha256Hash },
      ],
    },
    dependencies,
  );

  await dependencies.evidenceRepository.attachArkivEvent(evidence.id, {
    entityKey: event.entityKey,
    txHash: event.txHash,
  });

  return event;
}

export async function createAIReviewGeneratedEntity(
  job: Job,
  evidence: JobEvidence,
  dependencies: PublishDependencies,
  analyzedEvidence: JobEvidence[] = [evidence],
): Promise<ArkivEvent> {
  const eventType = "ai_review_generated";
  const payload = {
    ...basePayload(eventType),
    job: {
      id: job.id,
      status: "ai_reviewed",
      serviceId: job.serviceId,
    },
    aiReview: {
      evidenceId: evidence.id,
      summary: evidence.aiSummary,
      status: evidence.aiStatus,
      sourceHash: evidence.sha256Hash,
      evidenceAnalysis: analyzedEvidence.map((item) => ({
        evidenceId: item.id,
        type: item.type,
        summary: item.aiSummary,
        status: item.aiStatus,
        sourceHash: item.sha256Hash,
        createdAt: item.createdAt,
      })),
    },
  };

  return publishAndRecord(
    {
      localSubjectType: "evidence",
      localSubjectId: evidence.id,
      eventType,
      payload,
      attributes: [
        ...baseAttributes(eventType, "evidence", evidence.id),
        { key: "jobId", value: job.id },
        { key: "evidenceId", value: evidence.id },
        { key: "aiStatus", value: evidence.aiStatus },
        { key: "sha256Hash", value: evidence.sha256Hash },
        { key: "evidenceCount", value: analyzedEvidence.length },
      ],
    },
    dependencies,
  );
}

export async function createJobCompletedEntity(
  job: Job,
  dependencies: PublishDependencies,
): Promise<ArkivEvent> {
  const eventType = "job_completed";
  const completedAt = new Date().toISOString();
  const payload = {
    ...basePayload(eventType),
    job: {
      id: job.id,
      clientId: job.clientId,
      providerId: job.providerId,
      serviceId: job.serviceId,
      title: job.title,
      status: "completed",
      completedAt,
    },
  };

  return publishAndRecord(
    {
      localSubjectType: "job",
      localSubjectId: job.id,
      eventType,
      payload,
      attributes: [
        ...baseAttributes(eventType, "job", job.id),
        { key: "jobId", value: job.id },
        { key: "clientId", value: job.clientId },
        { key: "providerId", value: job.providerId ?? "unassigned" },
        { key: "serviceId", value: job.serviceId },
        { key: "status", value: "completed" },
      ],
    },
    dependencies,
  );
}

