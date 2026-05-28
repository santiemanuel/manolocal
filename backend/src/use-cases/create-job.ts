import type { CreateJobInput, Job, JobsRepository } from "../repositories/ports.ts";

export type CreateJobDependencies = {
  jobsRepository: JobsRepository;
};

export async function createJob(
  input: CreateJobInput,
  dependencies: CreateJobDependencies,
): Promise<Job> {
  return dependencies.jobsRepository.create(input);
}
