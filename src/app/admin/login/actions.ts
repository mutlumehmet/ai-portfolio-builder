"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { createSession, verifyPassword } from "@/lib/auth";
import { features } from "@/lib/config";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type LoginState = {
  error: string | null;
};

export async function login(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  if (!features.admin) return { error: "Admin is turned off." };

  const password = String(formData.get("password") ?? "");
  const from = String(formData.get("from") ?? "");

  const ip = clientIp(await headers());
  if (!rateLimit("admin-login", ip, 5, 15 * 60_000)) {
    return { error: "Too many attempts. Try again in 15 minutes." };
  }

  if (!verifyPassword(password)) {
    return { error: "Incorrect password." };
  }

  await createSession();
  // Only follow a redirect back into the admin area, never to another site.
  const safeFrom = /^\/admin(\/|$)/.test(from) ? from : "/admin/projects";
  redirect(safeFrom);
}
