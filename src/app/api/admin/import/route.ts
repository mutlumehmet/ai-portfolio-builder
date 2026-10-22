// Draft step of /admin/import. A route handler rather than a server action,
// so the CV upload (up to 5 MB per file) does not need a higher body limit
// for every server action in the app. The /admin proxy does not cover /api,
// so this checks the admin session itself.
import { NextResponse } from "next/server";

import { isAuthenticated } from "@/lib/auth";
import { features } from "@/lib/config";
import { MAX_CV_BYTES } from "@/lib/profile-import/cv";
import { buildProfileDraft, hasUsableSource, ProfileImportError } from "@/lib/profile-import/draft";
import { gatherSources } from "@/lib/profile-import/gather";
import { normaliseLinkedInUrl } from "@/lib/profile-import/linkedin";
import type { DraftResponse } from "@/lib/profile-import/schema";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Two files (CV and LinkedIn PDF) of up to 5 MB each, plus the form encoding.
const MAX_BODY = 2 * MAX_CV_BYTES + 512 * 1024;

const empty: DraftResponse = {
  id: 0,
  error: null,
  warnings: [],
  linkedinFailure: null,
  draft: null,
  dropped: [],
  fromFixture: false,
};

function fail(error: string, status: number) {
  return NextResponse.json({ ...empty, id: Date.now(), error } satisfies DraftResponse, { status });
}

// Reads the body with a hard cap, so a request without (or with a false)
// Content-Length still cannot push more than MAX_BODY into memory.
async function readCapped(request: Request) {
  if (!request.body) return null;
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

export async function POST(request: Request) {
  // Same check as requireAdmin(): the admin feature is on and the session cookie is valid.
  if (!features.admin || !(await isAuthenticated())) return fail("Unauthorized.", 401);

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BODY) return fail("The upload is too large (max 5 MB per file).", 413);

  // Each draft is one OpenAI call on the owner's key: 10 an hour per IP.
  if (!rateLimit("admin-import", clientIp(request.headers), 10, 60 * 60_000)) {
    return NextResponse.json(
      { ...empty, id: Date.now(), error: "That is 10 drafts in an hour. Wait a while and try again." },
      { status: 429, headers: { "Retry-After": "600" } }
    );
  }

  const body = await readCapped(request);
  if (!body) return fail("The upload is too large (max 5 MB per file).", 413);
  let form: FormData;
  try {
    form = await new Response(body, { headers: { "content-type": request.headers.get("content-type") ?? "" } }).formData();
  } catch {
    return fail("Send the form as multipart/form-data.", 400);
  }

  const linkedinUrl = String(form.get("linkedin") ?? "").slice(0, 300);
  const githubUser = String(form.get("github") ?? "").slice(0, 100);
  const files: { name: string; buffer: Buffer; label?: string }[] = [];
  for (const [field, label] of [
    ["cv", undefined],
    ["linkedinPdf", "LinkedIn PDF"],
  ] as const) {
    const file = form.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > MAX_CV_BYTES) return fail(`${file.name} is too large (max 5 MB).`, 413);
    files.push({ name: file.name, buffer: Buffer.from(await file.arrayBuffer()), label: label && `${label} ${file.name}` });
  }
  if (!linkedinUrl.trim() && !githubUser.trim() && files.length === 0) {
    return fail("Give at least one of a LinkedIn URL, a CV file or a GitHub username.", 400);
  }

  // With the LinkedIn PDF in hand the page is not fetched again; the URL is
  // still kept as the profile link.
  const hasLinkedInPdf = files.some((f) => f.label);
  const { sources, warnings, linkedinFailure } = await gatherSources({
    linkedinUrl: hasLinkedInPdf ? undefined : linkedinUrl,
    githubUser,
    files,
  });
  const typedUrl = normaliseLinkedInUrl(linkedinUrl);
  if (hasLinkedInPdf && typedUrl) sources.linkedin = { status: "failed", url: typedUrl, reason: "replaced by the PDF" };

  const base: DraftResponse = {
    ...empty,
    id: Date.now(),
    warnings: warnings.filter((w) => w !== linkedinFailure),
    linkedinFailure: linkedinFailure ?? null,
  };
  if (!hasUsableSource(sources)) {
    return NextResponse.json({ ...base, error: "None of the sources could be read, so there is nothing to draft from." });
  }

  try {
    const result = await buildProfileDraft(sources);
    return NextResponse.json({ ...base, draft: result.draft, dropped: result.dropped, fromFixture: result.fromFixture });
  } catch (err) {
    if (err instanceof ProfileImportError) return NextResponse.json({ ...base, error: err.message });
    console.error("Profile import failed", err);
    return NextResponse.json({ ...base, error: "The draft could not be made. Check the server log." }, { status: 500 });
  }
}
