// Best-effort, in-memory rate limiting per client IP.
//
// Each serverless instance keeps its own counters, so this is not a hard
// global cap: it stops a single client from hammering the AI endpoints
// through one warm instance, which is the common abuse case. A hard cap
// belongs in the Vercel Firewall and the OpenAI project budget (see SECURITY.md).

import { features, rateLimits } from "@/lib/config";

type Window = { start: number; count: number };

const buckets = new Map<string, Map<string, Window>>();

export function clientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";
}

// Returns true when the request is allowed, false when the limit is hit.
export function rateLimit(bucket: string, key: string, limit: number, windowMs: number) {
  let windows = buckets.get(bucket);
  if (!windows) {
    windows = new Map();
    buckets.set(bucket, windows);
  }

  const now = Date.now();
  const current = windows.get(key);
  if (!current || now - current.start >= windowMs) {
    windows.set(key, { start: now, count: 1 });
    if (windows.size > 10_000) {
      for (const [k, w] of windows) {
        if (now - w.start >= windowMs) windows.delete(k);
      }
    }
    return true;
  }

  current.count += 1;
  return current.count <= limit;
}

// Shared limits for the public AI endpoints (chat, fit check, parse, MCP).
export function aiRequestAllowed(request: Request) {
  if (!features.rateLimit) return true;
  const ip = clientIp(request.headers);
  return (
    rateLimit("ai-minute", ip, rateLimits.perMinute, 60_000) &&
    rateLimit("ai-day", ip, rateLimits.perDay, 24 * 60 * 60_000)
  );
}

export function tooManyRequests() {
  return Response.json(
    { error: "Too many requests. Please wait a minute and try again." },
    { status: 429, headers: { "Retry-After": "60" } }
  );
}

export function featureOff() {
  return Response.json({ error: "Not found." }, { status: 404 });
}

// Reads a JSON body without throwing on malformed input.
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return null;
  }
}
