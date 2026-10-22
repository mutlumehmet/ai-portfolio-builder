import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

import { features } from "@/lib/config";

const COOKIE_NAME = "admin_session";
const MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

const PLACEHOLDERS = new Set(["", "change-me", "change-me-too"]);

// Fails loudly when a secret is missing, and in production also when it is
// still the placeholder from .env.example.
function requiredSecret(name: "SESSION_SECRET" | "ADMIN_PASSWORD") {
  const value = process.env[name] ?? "";
  if (!value || (process.env.NODE_ENV === "production" && PLACEHOLDERS.has(value))) {
    throw new Error(`${name} is missing or still set to the example value. Set it in your environment.`);
  }
  return value;
}

function sign(value: string) {
  const secret = requiredSecret("SESSION_SECRET");
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function makeToken() {
  const issuedAt = Date.now().toString();
  const signature = sign(issuedAt);
  return `${issuedAt}.${signature}`;
}

function isValidToken(token: string) {
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const expected = sign(issuedAt);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  if (!timingSafeEqual(a, b)) return false;

  const age = Date.now() - Number(issuedAt);
  return age >= 0 && age < MAX_AGE_SECONDS * 1000;
}

export function verifyPassword(password: string) {
  const expected = requiredSecret("ADMIN_PASSWORD");
  const a = Buffer.from(password);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function createSession() {
  const store = await cookies();
  store.set(COOKIE_NAME, makeToken(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroySession() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function isAuthenticated() {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return false;
  return isValidToken(token);
}

// Server actions are plain POST endpoints that can be called from any route,
// so the /admin proxy alone does not protect them. Every admin action calls this first.
export async function requireAdmin() {
  if (!features.admin || !(await isAuthenticated())) {
    throw new Error("Unauthorized");
  }
}

export { COOKIE_NAME };
