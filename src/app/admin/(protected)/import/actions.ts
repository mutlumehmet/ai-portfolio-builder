"use server";

// The draft itself is made by POST /api/admin/import (it takes file uploads).
// Saving the reviewed draft is a server action: it only sends small JSON.
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { saveDraftToDatabase } from "@/lib/profile-import/save";
import { draftSchema } from "@/lib/profile-import/schema";
import { syncRagIndexAfterResponse } from "@/lib/rag-sync-after";

// A full draft is well under 100 KB; anything far bigger is not one.
const MAX_DRAFT_JSON = 200_000;

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
  if (JSON.stringify(draftInput ?? null).length > MAX_DRAFT_JSON) return { error: "The draft is too large to save." };
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
