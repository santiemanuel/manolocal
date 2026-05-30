import { GoogleGenAI } from "@google/genai";

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
