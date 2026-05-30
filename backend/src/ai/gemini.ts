import {
  GoogleGenAI,
  createPartFromBase64,
  createPartFromText,
  type Part,
} from "@google/genai";

export const GEMINI_FLASH_LITE_MODEL = "gemini-flash-lite-latest";
const DEFAULT_TEST_PROMPT = "Responde en español con una frase breve confirmando que Gemini está disponible.";

type GeminiErrorKind = "missing_api_key" | "provider_error";

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly kind: GeminiErrorKind,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export type GeminiEvidenceInput = {
  id: string;
  type: "before" | "progress" | "after";
  description: string | null;
  sha256Hash: string;
  createdAt: string;
  imageBuffer: Buffer;
  mimeType: string;
  optimizedMaxDimension: number;
  optimizedWidth: number | null;
  optimizedHeight: number | null;
  optimizationReason: string;
};

export type GeminiEvidenceSetInput = {
  jobId: string;
  jobTitle: string;
  jobDescription: string;
  evidence: GeminiEvidenceInput[];
};

let client: GoogleGenAI | null = null;

function getApiKey() {
  const apiKey = process.env.GOOGLE_GEN_AI?.trim();
  if (!apiKey) {
    throw new GeminiError("La clave de Gemini no está configurada.", "missing_api_key");
  }

  return apiKey;
}

function getClient() {
  client ??= new GoogleGenAI({ apiKey: getApiKey() });
  return client;
}

function normalizePrompt(prompt: unknown, fallback = DEFAULT_TEST_PROMPT) {
  if (typeof prompt !== "string") {
    return fallback;
  }

  return prompt.trim() || fallback;
}

function evidenceSetPrompt(input: GeminiEvidenceSetInput) {
  const metadata = input.evidence.map((item, index) => ({
    id: item.id,
    type: item.type,
    sequence: index + 1,
    created_at: item.createdAt,
    sha256_hash: item.sha256Hash,
    optimized_max_dimension_px: item.optimizedMaxDimension,
    optimized_width_px: item.optimizedWidth,
    optimized_height_px: item.optimizedHeight,
    optimization_reason: item.optimizationReason,
    provider_description: item.description ?? "",
  }));

  return `Analizá este conjunto de imágenes de un trabajo de reparación o mantenimiento.

Trabajo:
- id: ${input.jobId}
- título: ${input.jobTitle}
- descripción: ${input.jobDescription}

Metadata cronológica de evidencias:
${JSON.stringify(metadata, null, 2)}

Reglas importantes:
- Las imágenes adjuntas son copias optimizadas para IA. El hash corresponde al archivo original guardado para auditoría.
- La descripción del proveedor es una declaración contextual, no una verdad confirmada.
- Usala para entender qué intenta documentar la imagen, pero contrastala con lo visible.
- No inventes causas técnicas que no sean visibles.
- No certifiques que una reparación quedó garantizada si solo se observa una mejora visual.
- Si no se puede confirmar algo visualmente, indicá la limitación.
- Compará especialmente before contra after.
- Las imágenes progress son opcionales y solo sirven como evidencia intermedia.
- El arreglo evidence_analysis debe incluir una entrada por cada evidencia adjunta, usando exactamente el id recibido.
- No omitas evidencias before ni progress: también necesitan una observación visual auditable.
- Respondé en español y únicamente con JSON válido.

Schema esperado:
{
  "case_summary": {
    "detected_service_type": "plumbing | electrical | cleaning | gardening | general_repair | unknown",
    "main_visible_issue": "string",
    "overall_evidence_quality": "low | medium | high"
  },
  "evidence_analysis": [
    {
      "id": "string",
      "type": "before | progress | after",
      "provider_description": "string",
      "visual_observation": "string",
      "description_match": "supported | partially_supported | contradicted | not_verifiable",
      "confidence": 0.0
    }
  ],
  "before_after_comparison": {
    "visible_change": true,
    "improvement_level": "none | partial | clear | strong | unknown",
    "remaining_visible_issues": ["string"]
  },
  "verdict": {
    "status": "not_enough_evidence | likely_not_fixed | partially_fixed | likely_fixed | unclear",
    "evidence_strength": "weak | moderate | strong",
    "public_summary": "string",
    "limitations": ["string"],
    "needs_human_review": true
  }
}`;
}

function errorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || !error) {
    return undefined;
  }

  if ("code" in error && error.code) {
    return String(error.code);
  }

  if ("cause" in error) {
    return errorCode(error.cause);
  }

  return undefined;
}

function logGeminiFailure(error: unknown) {
  const name = error instanceof Error ? error.name : typeof error;
  console.error("Falló la consulta a Gemini.", { name, code: errorCode(error) });
}

export async function queryGemini(prompt: unknown) {
  try {
    const response = await getClient().models.generateContent({
      model: GEMINI_FLASH_LITE_MODEL,
      contents: normalizePrompt(prompt),
    });
    const text = response.text?.trim();

    if (!text) {
      throw new Error("Gemini respondió sin texto.");
    }

    return {
      ok: true,
      model: GEMINI_FLASH_LITE_MODEL,
      text,
    };
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }

    logGeminiFailure(error);
    throw new GeminiError("No se pudo obtener una respuesta de Gemini.", "provider_error", error);
  }
}

export async function analyzeEvidenceSetWithGemini(input: GeminiEvidenceSetInput) {
  try {
    const parts: Part[] = [createPartFromText(evidenceSetPrompt(input))];

    input.evidence.forEach((item, index) => {
      parts.push(
        createPartFromText(
          `Imagen ${index + 1}: id=${item.id}, type=${item.type}, descripción del proveedor=${item.description ?? ""}`,
        ),
        createPartFromBase64(item.imageBuffer.toString("base64"), item.mimeType),
      );
    });

    const response = await getClient().models.generateContent({
      model: GEMINI_FLASH_LITE_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseMimeType: "application/json",
      },
    });
    const text = response.text?.trim();

    if (!text) {
      throw new Error("Gemini respondió sin texto.");
    }

    return {
      ok: true,
      model: GEMINI_FLASH_LITE_MODEL,
      text,
    };
  } catch (error) {
    if (error instanceof GeminiError) {
      throw error;
    }

    logGeminiFailure(error);
    throw new GeminiError("No se pudo obtener una respuesta de Gemini.", "provider_error", error);
  }
}
