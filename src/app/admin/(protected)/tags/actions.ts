"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export type TagFormState = {
  error: string | null;
};

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

const tagFormSchema = z.object({
  name: z.string().min(1, "Name is required."),
  kind: z.enum(["technology", "industry"]),
});

export async function createTag(
  _prevState: TagFormState,
  formData: FormData
): Promise<TagFormState> {
  await requireAdmin();
  const parsed = tagFormSchema.safeParse({
    name: formData.get("name"),
    kind: formData.get("kind"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const slug = slugify(parsed.data.name);
  if (!slug) {
    return { error: "That name doesn't produce a usable slug." };
  }

  try {
    await prisma.tag.create({
      data: { name: parsed.data.name, slug, kind: parsed.data.kind },
    });
  } catch {
    return { error: "Could not save. A tag with that name might already exist." };
  }

  revalidatePath("/admin/tags");
  revalidatePath("/admin/projects/new");
  revalidatePath("/projects");
  revalidatePath("/");

  return { error: null };
}

export async function deleteTag(id: string) {
  await requireAdmin();
  await prisma.tag.delete({ where: { id } });
  revalidatePath("/admin/tags");
  revalidatePath("/admin/projects/new");
  revalidatePath("/projects");
  revalidatePath("/");
}
