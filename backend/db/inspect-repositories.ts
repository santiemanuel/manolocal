import { createRepositories } from "../src/repositories/index.ts";

const repositories = createRepositories();

try {
  const services = await repositories.services.list();
  const providers = await repositories.services.listProviderProfiles();
  const jobs = await repositories.jobs.list();
  const evidence = await Promise.all(jobs.map((job) => repositories.evidence.listByJobId(job.id)));
  const arkivEvents = await repositories.arkivEvents.list();

  console.table({
    services: services.length,
    providers: providers.length,
    jobs: jobs.length,
    evidence: evidence.flat().length,
    arkivEvents: arkivEvents.length,
  });

  console.table(
    jobs.map((job) => ({
      id: job.id,
      title: job.title,
      status: job.status,
      serviceId: job.serviceId,
      arkivEntityKeyCreated: job.arkivEntityKeyCreated ?? "-",
    })),
  );
} finally {
  repositories.close?.();
}
