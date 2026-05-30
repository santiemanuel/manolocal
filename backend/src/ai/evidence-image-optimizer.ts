import sharp from "sharp";
import type { Job, Service } from "../repositories/ports.ts";

export type GeminiImageOptimizationPolicy = {
  maxDimension: 384 | 768;
  reason: string;
};

export type OptimizedGeminiImage = {
  buffer: Buffer;
  mimeType: "image/jpeg";
  maxDimension: 384 | 768;
  width: number | null;
  height: number | null;
  reason: string;
};

function normalizeSearchText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export function resolveGeminiImageOptimizationPolicy(
  job: Pick<Job, "title" | "description" | "serviceId">,
  service: Service | null,
): GeminiImageOptimizationPolicy {
  const searchable = normalizeSearchText(
    [
      job.serviceId,
      job.title,
      job.description,
      service?.id,
      service?.name,
      service?.category,
      service?.description,
    ]
      .filter(Boolean)
      .join(" "),
  );

  const needsDetail =
    /\b(plomeria|electricidad|grieta|grietas|humedad|conector|conectores|caneria|canerias|caneria fina|cano|canos|tuberia|tuberias|cable|cables|toma|tablero|medidor|etiqueta|numero de serie|serie)\b/.test(
      searchable,
    );

  if (needsDetail) {
    return {
      maxDimension: 768,
      reason: "detalle_fino_o_servicio_tecnico",
    };
  }

  return {
    maxDimension: 384,
    reason: "contexto_visual_general",
  };
}

export async function optimizeEvidenceImageForGemini(
  inputBuffer: Buffer,
  policy: GeminiImageOptimizationPolicy,
): Promise<OptimizedGeminiImage> {
  const buffer = await sharp(inputBuffer)
    .rotate()
    .resize({
      width: policy.maxDimension,
      height: policy.maxDimension,
      fit: "inside",
      withoutEnlargement: true,
    })
    .jpeg({
      quality: 82,
      mozjpeg: true,
    })
    .toBuffer();
  const metadata = await sharp(buffer).metadata();

  return {
    buffer,
    mimeType: "image/jpeg",
    maxDimension: policy.maxDimension,
    width: metadata.width ?? null,
    height: metadata.height ?? null,
    reason: policy.reason,
  };
}
