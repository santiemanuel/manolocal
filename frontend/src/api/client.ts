import type { CreateJobInput, EvidenceType, JobStatus, RemoteState } from "../types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "No se pudo completar la operación.";
    throw new Error(message);
  }

  return data as T;
}

async function requestForm<T>(path: string, body: FormData): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    body,
  });

  const data = (await response.json()) as unknown;

  if (!response.ok) {
    const message =
      data && typeof data === "object" && "error" in data && typeof data.error === "string"
        ? data.error
        : "No se pudo completar la operación.";
    throw new Error(message);
  }

  return data as T;
}

export function fetchState() {
  return request<RemoteState>("/api/state");
}

export function createJob(input: CreateJobInput) {
  return request<RemoteState>("/api/jobs", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function createEvidence(jobId: string, type: Extract<EvidenceType, "before" | "progress" | "after">, input: FormData) {
  return requestForm<RemoteState>(`/api/jobs/${jobId}/evidence/${type}`, input);
}

export function updateJobStatus(jobId: string, status: JobStatus) {
  return request<RemoteState>(`/api/jobs/${jobId}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}
