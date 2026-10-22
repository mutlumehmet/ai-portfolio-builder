import { siteConfig } from "@site-config";

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
  // The file upload only exists inside the fit check.
  out.parseJd = out.parseJd && out.fitCheck;
  return out;
}

// Resolved on the server. Client components get the flags they need as props,
// because env overrides are not visible in the browser bundle.
export const features = resolveFeatures();

export type Features = typeof features;

export const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || siteConfig.url).replace(/\/+$/, "");

export const chatModel = process.env.CHAT_MODEL || "gpt-4.1-mini";
// The Chunk table stores 1536-dimension vectors. If you switch to a model with
// a different output size, change vector(1536) in the schema and migration too.
export const embeddingModel = process.env.EMBEDDING_MODEL || "text-embedding-3-small";

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
