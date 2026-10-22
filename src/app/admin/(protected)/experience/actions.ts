"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { blockDataSchemas, type BlockType } from "@/lib/blocks";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncRagIndexAfterResponse } from "@/lib/rag-sync-after";
import type { Prisma } from "@/generated/prisma/client";

export type ExperienceFormState = {
  error: string | null;
};

const blockInputSchema = z.object({
  type: z.enum(["heading", "paragraph", "image", "youtube", "diagram", "code", "embed"]),
  data: z.record(z.string(), z.unknown()),
});

const experienceFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes only."),
  company: z.string().min(1, "Company is required."),
  location: z.string().optional(),
  startDate: z.coerce.date({ message: "Start date is required." }),
  endDate: z.coerce.date().optional(),
  order: z.coerce.number().int().default(0),
  blocks: z.array(blockInputSchema).default([]),
});

function parseExperienceForm(formData: FormData) {
  const rawBlocks = JSON.parse(String(formData.get("blocksJson") ?? "[]"));

  const parsed = experienceFormSchema.parse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    company: formData.get("company"),
    location: formData.get("location") || undefined,
    startDate: formData.get("startDate"),
    endDate: formData.get("endDate") || undefined,
    order: formData.get("order") || 0,
    blocks: rawBlocks,
  });

  for (const block of parsed.blocks) {
    blockDataSchemas[block.type as BlockType].parse(block.data);
  }

  return parsed;
}

export async function createExperience(
  _prevState: ExperienceFormState,
  formData: FormData
): Promise<ExperienceFormState> {
  await requireAdmin();
  let data: ReturnType<typeof parseExperienceForm>;
  try {
    data = parseExperienceForm(formData);
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : "Invalid form data." };
  }

  try {
    await prisma.experience.create({
      data: {
        title: data.title,
        slug: data.slug,
        company: data.company,
        location: data.location,
        startDate: data.startDate,
        endDate: data.endDate,
        order: data.order,
        blocks: {
          create: data.blocks.map((block, index) => ({
            order: index,
            type: block.type,
            data: block.data as Prisma.InputJsonValue,
          })),
        },
      },
    });
  } catch {
    return { error: "Could not save. That slug might already be in use." };
  }

  syncRagIndexAfterResponse();
  revalidatePath("/admin/experience");
  revalidatePath("/experience");
  redirect("/admin/experience");
}

export async function updateExperience(
  id: string,
  _prevState: ExperienceFormState,
  formData: FormData
): Promise<ExperienceFormState> {
  await requireAdmin();
  let data: ReturnType<typeof parseExperienceForm>;
  try {
    data = parseExperienceForm(formData);
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : "Invalid form data." };
  }

  try {
    await prisma.$transaction([
      prisma.experienceBlock.deleteMany({ where: { experienceId: id } }),
      prisma.experience.update({
        where: { id },
        data: {
          title: data.title,
          slug: data.slug,
          company: data.company,
          location: data.location,
          startDate: data.startDate,
          endDate: data.endDate,
          order: data.order,
          blocks: {
            create: data.blocks.map((block, index) => ({
              order: index,
              type: block.type,
              data: block.data as Prisma.InputJsonValue,
            })),
          },
        },
      }),
    ]);
  } catch {
    return { error: "Could not save. That slug might already be in use." };
  }

  syncRagIndexAfterResponse();
  revalidatePath("/admin/experience");
  revalidatePath("/experience");
  redirect("/admin/experience");
}

export async function deleteExperience(id: string) {
  await requireAdmin();
  await prisma.experience.delete({ where: { id } });
  syncRagIndexAfterResponse();
  revalidatePath("/admin/experience");
  revalidatePath("/experience");
}

export async function moveExperience(id: string, direction: "up" | "down") {
  await requireAdmin();
  const experiences = await prisma.experience.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  const index = experiences.findIndex((e) => e.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= experiences.length) return;

  [experiences[index], experiences[targetIndex]] = [
    experiences[targetIndex],
    experiences[index],
  ];

  await prisma.$transaction(
    experiences.map((e, i) => prisma.experience.update({ where: { id: e.id }, data: { order: i } }))
  );

  syncRagIndexAfterResponse();
  revalidatePath("/admin/experience");
  revalidatePath("/experience");
}
