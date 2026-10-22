import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { features } from "@/lib/config";

const COOKIE_NAME = "admin_session";
const MAX_AGE_MS = 60 * 60 * 24 * 7 * 1000;

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function isValidToken(token: string | undefined) {
  const secret = process.env.SESSION_SECRET;
  if (!token || !secret) return false;
  const [issuedAt, signature] = token.split(".");
  if (!issuedAt || !signature) return false;

  const expected = sign(issuedAt, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;

  const age = Date.now() - Number(issuedAt);
  return age >= 0 && age < MAX_AGE_MS;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // With the admin feature off, the whole /admin area does not exist.
  if (!features.admin) {
    return new NextResponse("Not found", { status: 404 });
  }

  if (pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (!isValidToken(token)) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("from", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
