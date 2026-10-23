// Which AI provider the site talks to, read from environment variables only.
// No SDK import here, so config.ts (and the proxy) can use these checks cheaply.
//
// Any OpenAI-compatible endpoint works: OpenAI by default, or Anthropic,
// Google Gemini, OpenRouter, Ollama and others through AI_BASE_URL.
//
//   AI_API_KEY          key for the chat model (OPENAI_API_KEY still works)
//   AI_BASE_URL         empty means OpenAI
//   CHAT_MODEL          default gpt-4.1-mini
//   EMBEDDING_API_KEY   optional; a separate key for embeddings
//   EMBEDDING_BASE_URL  optional; with neither embedding value set, embeddings
//                       use the AI_* values. EMBEDDING_API_KEY on its own means
//                       OpenAI embeddings (chat with Claude, embeddings with OpenAI).
//   EMBEDDING_MODEL     default text-embedding-3-small; "none" switches embeddings off
//   EMBEDDING_DIMENSIONS optional; sent as `dimensions` for models that can
//                       shorten their output to the 1536 the database stores

const env = (name: string) => process.env[name]?.trim() ?? "";

/** The Chunk.embedding column is vector(1536). See README "About the embedding dimension". */
export const EMBEDDING_COLUMN_DIMENSIONS = 1536;

export function aiSettings() {
  return {
    apiKey: env("AI_API_KEY") || env("OPENAI_API_KEY"),
    baseURL: env("AI_BASE_URL"),
    model: env("CHAT_MODEL") || "gpt-4.1-mini",
  };
}

export function embeddingSettings() {
  const ai = aiSettings();
  const ownKey = env("EMBEDDING_API_KEY");
  const ownBase = env("EMBEDDING_BASE_URL");
  const dims = Number(env("EMBEDDING_DIMENSIONS"));
  return {
    apiKey: ownKey || (ownBase ? "" : ai.apiKey),
    // A separate key without a base URL is an OpenAI key.
    baseURL: ownBase || (ownKey ? "" : ai.baseURL),
    model: env("EMBEDDING_MODEL") || "text-embedding-3-small",
    dimensions: Number.isInteger(dims) && dims > 0 ? dims : undefined,
  };
}

/** True when a chat model can be called: a key, or a keyless base URL such as a local Ollama. */
export function aiConfigured() {
  const ai = aiSettings();
  return Boolean(ai.apiKey || ai.baseURL);
}

/** True when embeddings can be made, which the chat, fit check and MCP need for their search. */
export function embeddingsConfigured() {
  const e = embeddingSettings();
  if (/^(none|off)$/i.test(e.model)) return false;
  // Anthropic's OpenAI-compatible API has no embeddings endpoint.
  if (/anthropic\.com/i.test(e.baseURL)) return false;
  return Boolean(e.apiKey || e.baseURL);
}

export const chatModel = aiSettings().model;
export const embeddingModel = embeddingSettings().model;
