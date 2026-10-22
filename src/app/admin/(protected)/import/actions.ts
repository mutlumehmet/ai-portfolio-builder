"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MAX_CV_BYTES } from "@/lib/profile-import/cv";
import { buildProfileDraft, hasUsableSource, ProfileImportError } from "@/lib/profile-import/draft";
import { gatherSources } from "@/lib/profile-import/gather";
import { normaliseLinkedInUrl } from "@/lib/profile-import/linkedin";
import { saveDraftToDatabase } from "@/lib/profile-import/save";
import { draftSchema, type ProfileDraft } from "@/lib/profile-import/schema";
import { syncRagIndexAfterResponse } from "@/lib/rag-sync-after";
import { clientIp, rateLimit } from "@/lib/rate-limit";

export type DraftState = {
  /** Changes on every run, so the review screen starts fresh for a new draft. */
  id: number;
  error: string | null;
  warnings: string[];
  linkedinFailure: string | null;
  draft: ProfileDraft | null;
  dropped: string[];
  fromFixture: boolean;
};

const empty: Omit<DraftState, "error"> = {
  id: 0,
  warnings: [],
  linkedinFailure: null,
  draft: null,
  dropped: [],
  fromFixture: false,
};

export async function generateImportDraft(_prev: DraftState, formData: FormData): Promise<DraftState> {
  await requireAdmin();

  // Each draft is one OpenAI call on the owner's key, so a stolen session or a
  // stuck button cannot run up a bill: 10 drafts an hour per IP.
  const ip = clientIp(await headers());
  if (!rateLimit("admin-import", ip, 10, 60 * 60_000)) {
    return { ...empty, id: Date.now(), error: "That is 10 drafts in an hour. Wait a while and try again." };
  }

  const linkedinUrl = String(formData.get("linkedin") ?? "").slice(0, 300);
  const githubUser = String(formData.get("github") ?? "").slice(0, 100);
  const files: { name: string; buffer: Buffer; label?: string }[] = [];
  for (const [field, label] of [
    ["cv", undefined],
    ["linkedinPdf", "LinkedIn PDF"],
  ] as const) {
    const file = formData.get(field);
    if (!(file instanceof File) || file.size === 0) continue;
    if (file.size > MAX_CV_BYTES) return { ...empty, error: `${file.name} is too large (max 5 MB).` };
    files.push({ name: file.name, buffer: Buffer.from(await file.arrayBuffer()), label: label && `${label} ${file.name}` });
  }

  if (!linkedinUrl.trim() && !githubUser.trim() && files.length === 0) {
    return { ...empty, error: "Give at least one of a LinkedIn URL, a CV file or a GitHub username." };
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
  const base = {
    ...empty,
    id: Date.now(),
    warnings: warnings.filter((w) => w !== linkedinFailure),
    linkedinFailure: linkedinFailure ?? null,
  };
  if (!hasUsableSource(sources)) {
    return { ...base, error: "None of the sources could be read, so there is nothing to draft from." };
  }

  try {
    const result = await buildProfileDraft(sources);
    return { ...base, error: null, draft: result.draft, dropped: result.dropped, fromFixture: result.fromFixture };
  } catch (err) {
    if (err instanceof ProfileImportError) return { ...base, error: err.message };
    console.error("Profile import failed", err);
    return { ...base, error: "The draft could not be made. Check the server log." };
  }
}

const selectionSchema = z.object({
  experience: z.boolean(),
  faqs: z.boolean(),
  projects: z.array(z.string().max(120)).max(20),
  removeSamples: z.boolean(),
});

export type SaveResult =
  | { error: string }
  | { error: null; projects: number; roles: number; faqs: number; removed: { projects: number; roles: number; faqs: number } | null };

export async function saveImportDraft(draftInput: unknown, selectionInput: unknown): Promise<SaveResult> {
  await requireAdmin();
  const draft = draftSchema.safeParse(draftInput);
  const selection = selectionSchema.safeParse(selectionInput);
  if (!draft.success || !selection.success) return { error: "The draft could not be read. Generate it again." };

  try {
    const saved = await saveDraftToDatabase(prisma, draft.data, selection.data);
    syncRagIndexAfterResponse();
    revalidatePath("/", "layout");
    return { error: null, ...saved };
  } catch (err) {
    console.error("Saving the import failed", err);
    return { error: err instanceof z.ZodError ? "A project in the draft is not valid." : "Could not save the draft." };
  }
}
