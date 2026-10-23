// The one place that creates AI clients. Every provider is reached through
// the OpenAI SDK pointed at an OpenAI-compatible endpoint (see ai-env.ts).
import OpenAI from "openai";

import {
  aiConfigured,
  aiSettings,
  EMBEDDING_COLUMN_DIMENSIONS,
  embeddingsConfigured,
  embeddingSettings,
} from "@/lib/ai-env";
import { parseJsonObject } from "@/lib/json-output";

export { aiConfigured, embeddingsConfigured };

export class AiNotConfiguredError extends Error {}

export const NO_AI_MESSAGE = "AI_API_KEY is not set (OPENAI_API_KEY also works), so the AI features are off.";
export const NO_EMBEDDINGS_MESSAGE =
  "No embedding provider is set up, so the search index cannot be built. Set AI_API_KEY for OpenAI, or EMBEDDING_API_KEY (and EMBEDDING_BASE_URL for a provider other than OpenAI).";

export type ChatOverrides = { apiKey?: string; baseURL?: string; model?: string };

// Keyless endpoints (a local Ollama) still need a non-empty key for the SDK.
function client(apiKey: string, baseURL: string) {
  return new OpenAI({ apiKey: apiKey || "not-needed", baseURL: baseURL || undefined });
}

export function chatClient(overrides: ChatOverrides = {}) {
  const base = aiSettings();
  const s = {
    apiKey: overrides.apiKey || base.apiKey,
    baseURL: overrides.baseURL || base.baseURL,
    model: overrides.model || base.model,
  };
  if (!s.apiKey && !s.baseURL) throw new AiNotConfiguredError(NO_AI_MESSAGE);
  return { client: client(s.apiKey, s.baseURL), model: s.model };
}

type Messages = { system: string; user: string };

/** One chat completion, returning the text of the answer. */
export async function chatText({ system, user }: Messages, overrides?: ChatOverrides) {
  const { client: ai, model } = chatClient(overrides);
  const completion = await ai.chat.completions.create({
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
  });
  return completion.choices[0]?.message.content ?? "";
}

/**
 * One chat completion that should answer with a JSON object. JSON mode is
 * requested where the provider supports it (some ignore it, a few reject it,
 * then the call is repeated without it), and the answer is always parsed
 * defensively. Validate the result with zod.
 */
export async function chatJson({ system, user }: Messages, overrides?: ChatOverrides): Promise<unknown> {
  const { client: ai, model } = chatClient(overrides);
  const messages = [
    { role: "system" as const, content: `${system}\n\nAnswer with the JSON object only, no other text.` },
    { role: "user" as const, content: user },
  ];
  let content: string;
  try {
    const completion = await ai.chat.completions.create({ model, messages, response_format: { type: "json_object" } });
    content = completion.choices[0]?.message.content ?? "";
  } catch (err) {
    const status = (err as { status?: number }).status;
    const message = err instanceof Error ? err.message : "";
    if (status !== 400 || !/response_format|json/i.test(message)) throw err;
    const completion = await ai.chat.completions.create({ model, messages });
    content = completion.choices[0]?.message.content ?? "";
  }
  return parseJsonObject(content);
}

/** Embeds texts with the embedding provider; checks the size matches the database column. */
export async function embedTexts(input: string[]): Promise<number[][]> {
  const s = embeddingSettings();
  if (!embeddingsConfigured()) throw new AiNotConfiguredError(NO_EMBEDDINGS_MESSAGE);
  const res = await client(s.apiKey, s.baseURL).embeddings.create({
    model: s.model,
    input,
    // Ask for plain numbers. Without this the SDK requests base64 and decodes
    // it, which garbles the answer of providers that ignore that option.
    encoding_format: "float",
    ...(s.dimensions ? { dimensions: s.dimensions } : {}),
  });
  const vectors = res.data.map((d) => d.embedding);
  const wrong = vectors.find((v) => v.length !== EMBEDDING_COLUMN_DIMENSIONS);
  if (wrong) {
    throw new Error(
      `The embedding model ${s.model} returned ${wrong.length} numbers per text, but the database stores ${EMBEDDING_COLUMN_DIMENSIONS}. ` +
        `Set EMBEDDING_DIMENSIONS=${EMBEDDING_COLUMN_DIMENSIONS} if the model can shorten its output, use text-embedding-3-small, ` +
        "or change vector(1536) in the schema (see README)."
    );
  }
  return vectors;
}
