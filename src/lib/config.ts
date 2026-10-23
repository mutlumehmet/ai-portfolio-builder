import { siteConfig } from "@site-config";

import { aiConfigured, chatModel, embeddingModel, embeddingsConfigured } from "@/lib/ai-env";

export { siteConfig };

type FeatureName = keyof typeof siteConfig.features;

// Env var names that override each flag in site.config.ts.
const FEATURE_ENV: Record<FeatureName, string> = {
  chat: "FEATURE_CHAT",
  fitCheck: "FEATURE_FIT_CHECK",
  parseJd: "FEATURE_PARSE_JD",
  mcp: "FEATURE_MCP",
  admin: "FEATURE_ADMIN",
  cv: "FEATURE_CV",
  easterEggs: "FEATURE_EASTER_EGGS",
  rateLimit: "FEATURE_RATE_LIMIT",
};

function envFlag(name: string): boolean | undefined {
  const raw = process.env[name]?.trim().toLowerCase();
  if (!raw) return undefined;
  if (["1", "true", "on", "yes"].includes(raw)) return true;
  if (["0", "false", "off", "no"].includes(raw)) return false;
  return undefined;
}

function resolveFeatures() {
  const out = { ...siteConfig.features };
  for (const key of Object.keys(FEATURE_ENV) as FeatureName[]) {
    const override = envFlag(FEATURE_ENV[key]);
    if (override !== undefined) out[key] = override;
  }
  // The chat, the fit check and the MCP server need a chat model and
  // embeddings for their search; without them they are off, whatever the flags say.
  const aiReady = aiConfigured() && embeddingsConfigured();
  out.chat = out.chat && aiReady;
  out.fitCheck = out.fitCheck && aiReady;
  out.mcp = out.mcp && aiReady;
  // The file upload only exists inside the fit check.
  out.parseJd = out.parseJd && out.fitCheck;
  return out;
}

// Resolved on the server. Client components get the flags they need as props,
// because env overrides are not visible in the browser bundle.
export const features = resolveFeatures();

export type Features = typeof features;

export const siteUrl = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`) ||
  siteConfig.url
).replace(/\/+$/, "");

// The AI provider settings live in ai-env.ts (AI_API_KEY, AI_BASE_URL,
// CHAT_MODEL, EMBEDDING_*). The Chunk table stores 1536-dimension vectors; a
// model with a different output size needs vector(1536) changed in the schema
// and migration too.
export { chatModel, embeddingModel };

function intEnv(name: string, fallback: number) {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

export const rateLimits = {
  perMinute: intEnv("RATE_LIMIT_PER_MINUTE", siteConfig.rateLimit.perMinute),
  perDay: intEnv("RATE_LIMIT_PER_DAY", siteConfig.rateLimit.perDay),
};

export const socialLinks = (
  [
    ["GitHub", siteConfig.socials.github],
    ["LinkedIn", siteConfig.socials.linkedin],
    ["X", siteConfig.socials.x],
  ] as const
)
  .filter(([, href]) => Boolean(href))
  .map(([label, href]) => ({ label, href }));

// Swap {email} and {name} placeholders in config strings.
export function fillPlaceholders(text: string) {
  return text
    .replaceAll("{email}", siteConfig.contact.email)
    .replaceAll("{name}", siteConfig.person.name);
}
