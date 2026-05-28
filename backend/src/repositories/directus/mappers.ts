import type {
  AiStatus,
  ArkivAttribute,
  ArkivEvent,
  EvidenceType,
  Job,
  JobEvidence,
  JobStatus,
  ProviderProfile,
  Review,
  Service,
  User,
  UserRole,
} from "../ports.ts";

export type DirectusUser = {
  id: string;
  name: string;
  role: UserRole;
  avatar_url: string | null;
  city: string | null;
  rating: number | string | null;
};

export type DirectusService = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  base_price: number | string | null;
  icon: string | null;
};

export type DirectusProviderProfile = {
  id: string;
  user_id: string | DirectusUser;
  bio: string | null;
  service_categories: string[] | string | null;
  experience_years: number | string | null;
  verified_jobs_count: number | string | null;
  rating_average: number | string | null;
};

export type DirectusJob = {
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

export type DirectusEvidence = {
  id: string;
  job_id: string;
  uploaded_by: string;
  type: EvidenceType;
  file: string | { id: string } | null;
  local_file_path: string | null;
  public_file_url: string | null;
  description: string | null;
  sha256_hash: string;
  ai_summary: string | null;
  ai_status: AiStatus;
  arkiv_entity_key: string | null;
  arkiv_tx_hash: string | null;
  created_at: string;
};

export type DirectusReview = {
  id: string;
  job_id: string;
  client_id: string;
  provider_id: string;
  rating: number | string;
  comment: string | null;
  created_at: string;
};

export type DirectusArkivEvent = {
  id: string;
  local_subject_type: string;
  local_subject_id: string;
  event_type: string;
  entity_key: string;
  tx_hash: string;
  payload_json: unknown;
  attributes_json: unknown;
  created_at: string;
};

export function toUser(row: DirectusUser): User {
  return {
    id: row.id,
    name: row.name,
    role: row.role,
    avatarUrl: row.avatar_url,
    city: row.city,
    rating: Number(row.rating ?? 0),
  };
}

export function toService(row: DirectusService): Service {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    description: row.description,
    basePrice: row.base_price === null ? null : Number(row.base_price),
    icon: row.icon,
  };
}

export function toProviderProfile(row: DirectusProviderProfile, usersById: Map<string, User>): ProviderProfile {
  const user = typeof row.user_id === "string" ? usersById.get(row.user_id) : toUser(row.user_id);
  if (!user) {
    throw new Error(`No existe el usuario del perfil ${row.id}.`);
  }

  return {
    id: row.id,
    user,
    bio: row.bio,
    serviceCategories: parseStringArray(row.service_categories),
    experienceYears: Number(row.experience_years ?? 0),
    verifiedJobsCount: Number(row.verified_jobs_count ?? 0),
    ratingAverage: Number(row.rating_average ?? 0),
  };
}

export function toJob(row: DirectusJob): Job {
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

export function directusFileId(file: DirectusEvidence["file"]): string | null {
  if (!file) return null;
  return typeof file === "string" ? file : file.id;
}

export function toEvidence(row: DirectusEvidence, assetUrl?: (fileId: string) => string): JobEvidence {
  const fileId = directusFileId(row.file);

  return {
    id: row.id,
    jobId: row.job_id,
    uploadedBy: row.uploaded_by,
    type: row.type,
    localFilePath: row.local_file_path ?? "",
    publicFileUrl: row.public_file_url ?? (fileId && assetUrl ? assetUrl(fileId) : null),
    description: row.description,
    sha256Hash: row.sha256_hash,
    aiSummary: row.ai_summary,
    aiStatus: row.ai_status,
    arkivEntityKey: row.arkiv_entity_key,
    arkivTxHash: row.arkiv_tx_hash,
    createdAt: row.created_at,
  };
}

export function toReview(row: DirectusReview): Review {
  return {
    id: row.id,
    jobId: row.job_id,
    clientId: row.client_id,
    providerId: row.provider_id,
    rating: Number(row.rating),
    comment: row.comment,
    createdAt: row.created_at,
  };
}

export function toArkivEvent(row: DirectusArkivEvent): ArkivEvent {
  return {
    id: row.id,
    localSubjectType: row.local_subject_type,
    localSubjectId: row.local_subject_id,
    eventType: row.event_type,
    entityKey: row.entity_key,
    txHash: row.tx_hash,
    payloadJson: stringifyJson(row.payload_json),
    attributesJson: stringifyJson(row.attributes_json),
    createdAt: row.created_at,
  };
}

export function parseJson(value: string): unknown {
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

function parseStringArray(value: string[] | string | null): string[] {
  if (Array.isArray(value)) return value.map(String);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

function stringifyJson(value: unknown): string {
  return typeof value === "string" ? value : JSON.stringify(value);
}

export function attributesToJson(attributes: ArkivAttribute[] | string): unknown {
  return typeof attributes === "string" ? parseJson(attributes) : attributes;
}
