export type UserRole = "client" | "provider" | "admin";

export type User = {
  id: string;
  name: string;
  role: UserRole;
  avatarUrl?: string | null;
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

export type ArkivEvent = {
  id: string;
  localSubjectType: string;
  localSubjectId: string;
  eventType: string;
  entityKey: string;
  txHash: string;
  payloadJson?: string;
  attributesJson?: string;
  createdAt: string;
};

export type RemoteState = {
  users: User[];
  services: Service[];
  providerProfiles: ProviderProfile[];
  jobs: Job[];
  evidence: JobEvidence[];
  reviews: Review[];
  arkivEvents: ArkivEvent[];
};

export type Review = {
  id: string;
  jobId: string;
  clientId: string;
  providerId: string;
  rating: number;
  comment: string | null;
  createdAt: string;
};
