import type {
  CreateEvidenceInput,
  EvidenceRepository,
  JobEvidence,
  JobsRepository,
} from "../repositories/ports.ts";

export type UploadEvidenceDependencies = {
  evidenceRepository: EvidenceRepository;
  jobsRepository: JobsRepository;
};

export async function uploadEvidence(
  input: CreateEvidenceInput,
  dependencies: UploadEvidenceDependencies,
): Promise<JobEvidence> {
  const evidence = await dependencies.evidenceRepository.create(input);
  await dependencies.jobsRepository.updateStatus(input.jobId, "evidence_uploaded");

  return evidence;
}
