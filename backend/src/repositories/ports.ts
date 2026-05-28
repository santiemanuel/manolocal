export type UserRole = "client" | "provider" | "admin";

export type User = {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  city: string | null;
  rating: number;
};

export type Service = {
  id: string;
  name: string;
  category: string;
  description: string | null;
  basePrice: number | null;
  icon: string | null;
};

export type ProviderProfile = {
  id: string;
  user: User;
  bio: string | null;
  serviceCategories: string[];
  experienceYears: number;
  verifiedJobsCount: number;
  ratingAverage: number;
};

export type JobStatus =
  | "requested"
  | "accepted"
  | "in_progress"
  | "evidence_uploaded"
  | "ai_reviewed"
  | "completed";

export type Job = {
  id: string;
  clientId: string;
  providerId: string | null;
  serviceId: string;
  title: string;
  description: string;
  status: JobStatus;
  addressArea: string | null;
  scheduledDate: string | null;
  createdAt: string;
  updatedAt: string;
  arkivEntityKeyCreated: string | null;
  arkivTxHashCreated: string | null;
};

export type CreateJobInput = {
  clientId: string;
  providerId?: string | null;
  serviceId: string;
  title: string;
  description: string;
  addressArea?: string | null;
  scheduledDate?: string | null;
};

export type EvidenceType = "before" | "progress" | "after" | "receipt" | "issue";
export type AiStatus = "pending" | "valid" | "warning" | "rejected";

export type JobEvidence = {
  id: string;
  jobId: string;
  uploadedBy: string;
  type: EvidenceType;
  localFilePath: string;
  publicFileUrl: string | null;
  description: string | null;
  sha256Hash: string;
  aiSummary: string | null;
  aiStatus: AiStatus;
  arkivEntityKey: string | null;
  arkivTxHash: string | null;
  createdAt: string;
};

export type CreateEvidenceInput = {
  jobId: string;
  uploadedBy: string;
  type: EvidenceType;
  localFilePath: string;
  publicFileUrl?: string | null;
  description?: string | null;
  sha256Hash: string;
};

export type ArkivAttributeValue = string | number;

export type ArkivAttribute = {
  key: string;
  value: ArkivAttributeValue;
};

export type ArkivEvent = {
  id: string;
  localSubjectType: string;
  localSubjectId: string;
  eventType: string;
  entityKey: string;
  txHash: string;
  payloadJson: string;
  attributesJson: string;
  createdAt: string;
};

export type CreateArkivEventInput = {
  localSubjectType: string;
  localSubjectId: string;
  eventType: string;
  entityKey: string;
  txHash: string;
  payloadJson: string;
  attributesJson: string;
};

export interface JobsRepository {
  create(input: CreateJobInput): Promise<Job>;
  findById(id: string): Promise<Job | null>;
  list(): Promise<Job[]>;
  updateStatus(id: string, status: JobStatus): Promise<void>;
  attachCreatedArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void>;
}

export interface EvidenceRepository {
  create(input: CreateEvidenceInput): Promise<JobEvidence>;
  findById(id: string): Promise<JobEvidence | null>;
  listByJobId(jobId: string): Promise<JobEvidence[]>;
  attachArkivEvent(id: string, event: { entityKey: string; txHash: string }): Promise<void>;
  attachAIReview(id: string, review: { summary: string; status: AiStatus }): Promise<void>;
}

export interface ServicesRepository {
  findById(id: string): Promise<Service | null>;
  list(): Promise<Service[]>;
  listProviderProfiles(): Promise<ProviderProfile[]>;
}

export interface ArkivEventsRepository {
  create(input: CreateArkivEventInput): Promise<ArkivEvent>;
  list(): Promise<ArkivEvent[]>;
  listBySubject(localSubjectType: string, localSubjectId: string): Promise<ArkivEvent[]>;
}

export type RepositorySet = {
  jobs: JobsRepository;
  evidence: EvidenceRepository;
  services: ServicesRepository;
  arkivEvents: ArkivEventsRepository;
};
