// AI providers the setup wizard offers. All are reached through their
// OpenAI-compatible endpoints (see src/lib/ai-env.ts). Base URLs and model ids
// were checked against each provider's own documentation on 23 October 2026:
//   Anthropic  platform.claude.com/docs/en/api/openai-sdk and .../models/overview
//   Gemini     ai.google.dev/gemini-api/docs/openai, .../models, .../embeddings
//   OpenRouter openrouter.ai/docs/quickstart and .../api-reference/embeddings
//   Ollama     docs.ollama.com/api/openai-compatibility
// Models change often: the wizard shows each default so the owner can type another.

export type ProviderName =
  | "OpenAI"
  | "Anthropic (Claude)"
  | "Google Gemini"
  | "OpenRouter"
  | "Ollama (local)"
  | "Other (OpenAI-compatible)";

export type Provider = {
  baseURL: string;
  /** Empty: the wizard asks for the model with no default. */
  chatModel: string;
  /** Where to create a key; empty when no key is needed. */
  keyHint: string;
  needsKey: boolean;
  /**
   * Embeddings through the same endpoint and key, when that is known to work.
   * `dimensions` is sent as EMBEDDING_DIMENSIONS so the vectors fit vector(1536).
   */
  embeddings: { model: string; dimensions?: number; note?: string } | "ask-model" | null;
  note?: string;
};

export const PROVIDERS: Record<ProviderName, Provider> = {
  OpenAI: {
    baseURL: "",
    chatModel: "gpt-4.1-mini",
    keyHint: "Create one at https://platform.openai.com/api-keys",
    needsKey: true,
    embeddings: { model: "text-embedding-3-small" },
  },
  "Anthropic (Claude)": {
    baseURL: "https://api.anthropic.com/v1/",
    chatModel: "claude-haiku-5-5",
    keyHint: "Create one at https://platform.claude.com/settings/keys",
    needsKey: true,
    // Anthropic has no embeddings API.
    embeddings: null,
    note: "Claude through Anthropic's OpenAI-compatible endpoint. Anthropic has no embeddings, so the search index needs another provider.",
  },
  "Google Gemini": {
    baseURL: "https://generativelanguage.googleapis.com/v1beta/openai/",
    chatModel: "gemini-3.8-flash",
    keyHint: "Create one in Google AI Studio",
    needsKey: true,
    embeddings: {
      model: "gemini-embedding-001",
      dimensions: 1536,
      note: "gemini-embedding-001 can return 1536 numbers; whether the OpenAI-compatible endpoint passes the size through is not confirmed, and the index build stops with a clear message if it does not.",
    },
  },
  OpenRouter: {
    baseURL: "https://openrouter.ai/api/v1",
    chatModel: "openai/gpt-4.1-mini",
    keyHint: "Create one in your OpenRouter account settings",
    needsKey: true,
    embeddings: { model: "openai/text-embedding-3-small" },
  },
  "Ollama (local)": {
    baseURL: "http://localhost:11434/v1/",
    chatModel: "gpt-oss:20b",
    keyHint: "",
    needsKey: false,
    embeddings: "ask-model",
    note: "Ollama runs on this machine only: it works with npm run dev, not on Vercel. Pull the model first (ollama pull <model>).",
  },
  "Other (OpenAI-compatible)": {
    baseURL: "",
    chatModel: "",
    keyHint: "",
    needsKey: false,
    embeddings: "ask-model",
  },
};

export type AiChoice = {
  provider: ProviderName;
  apiKey: string;
  baseURL: string;
  chatModel: string;
  embedding:
    | { kind: "same"; model: string; dimensions?: number }
    | { kind: "openai"; apiKey: string }
    | { kind: "none" };
};

/** The environment variables for a choice. Every name is present (empty when unused). */
export function aiEnv(choice: AiChoice | null): Record<string, string> {
  const vars: Record<string, string> = {
    AI_API_KEY: "",
    AI_BASE_URL: "",
    CHAT_MODEL: "",
    EMBEDDING_API_KEY: "",
    EMBEDDING_BASE_URL: "",
    EMBEDDING_MODEL: "",
    EMBEDDING_DIMENSIONS: "",
    OPENAI_API_KEY: "",
  };
  if (!choice) return vars;
  vars.AI_API_KEY = choice.apiKey;
  vars.AI_BASE_URL = choice.baseURL;
  vars.CHAT_MODEL = choice.chatModel;
  if (choice.embedding.kind === "same") {
    vars.EMBEDDING_MODEL = choice.embedding.model;
    if (choice.embedding.dimensions) vars.EMBEDDING_DIMENSIONS = String(choice.embedding.dimensions);
  } else if (choice.embedding.kind === "openai") {
    // A separate key with no base URL means OpenAI (see src/lib/ai-env.ts).
    vars.EMBEDDING_API_KEY = choice.embedding.apiKey;
    vars.EMBEDDING_MODEL = "text-embedding-3-small";
  } else {
    vars.EMBEDDING_MODEL = "none";
  }
  return vars;
}

/** .env lines for a choice, with only the values that are set. */
export function aiEnvLines(choice: AiChoice | null): string[] {
  if (!choice) {
    return ["# No AI provider: the chat, fit check and MCP server are off. See .env.example to turn them on.", 'AI_API_KEY=""'];
  }
  const lines = [`# AI provider: ${choice.provider}`];
  for (const [name, value] of Object.entries(aiEnv(choice))) {
    if (value && name !== "OPENAI_API_KEY") lines.push(`${name}="${value}"`);
  }
  if (!choice.apiKey) lines.push('AI_API_KEY=""');
  if (choice.embedding.kind === "none") {
    lines.push(
      '# No embeddings: the chat, fit check and MCP server stay off. To turn them on, set EMBEDDING_API_KEY (an OpenAI key) and remove EMBEDDING_MODEL="none".'
    );
  }
  return lines;
}
