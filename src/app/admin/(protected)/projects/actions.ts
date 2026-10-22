"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { blockDataSchemas, type BlockType } from "@/lib/blocks";
import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncRagIndexAfterResponse } from "@/lib/rag-sync-after";
import type { Prisma } from "@/generated/prisma/client";

export type ProjectFormState = {
  error: string | null;
};

const blockInputSchema = z.object({
  type: z.enum(["heading", "paragraph", "image", "youtube", "diagram", "code", "embed"]),
  data: z.record(z.string(), z.unknown()),
});

const projectFormSchema = z.object({
  title: z.string().min(1, "Title is required."),
  slug: z
    .string()
    .min(1, "Slug is required.")
    .regex(/^[a-z0-9-]+$/, "Slug must be lowercase letters, numbers, and dashes only."),
  summary: z.string().min(1, "Summary is required."),
  coverImageUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  repoUrl: z.string().optional(),
  role: z.string().optional(),
  year: z.coerce.number().int().optional(),
  yearRange: z.string().optional(),
  years: z.array(z.number().int()).default([]),
  category: z.enum(["commercial", "personal"]).default("commercial"),
  featured: z.boolean(),
  order: z.coerce.number().int().default(0),
  tagIds: z.array(z.string()).default([]),
  blocks: z.array(blockInputSchema).default([]),
});

function parseProjectForm(formData: FormData) {
  const rawBlocks = JSON.parse(String(formData.get("blocksJson") ?? "[]"));

  const parsed = projectFormSchema.parse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    summary: formData.get("summary"),
    coverImageUrl: formData.get("coverImageUrl") || undefined,
    liveUrl: formData.get("liveUrl") || undefined,
    repoUrl: formData.get("repoUrl") || undefined,
    role: formData.get("role") || undefined,
    year: formData.get("year") || undefined,
    yearRange: formData.get("yearRange") || undefined,
    years: String(formData.get("years") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .map(Number),
    category: formData.get("category") || undefined,
    featured: formData.get("featured") === "on",
    order: formData.get("order") || 0,
    tagIds: formData.getAll("tagIds"),
    blocks: rawBlocks,
  });

  // Validate each block's `data` shape against its type-specific schema.
  for (const block of parsed.blocks) {
    blockDataSchemas[block.type as BlockType].parse(block.data);
  }

  return parsed;
}

export async function createProject(
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireAdmin();
  let data: ReturnType<typeof parseProjectForm>;
  try {
    data = parseProjectForm(formData);
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : "Invalid form data." };
  }

  try {
    await prisma.project.create({
      data: {
        title: data.title,
        slug: data.slug,
        summary: data.summary,
        coverImageUrl: data.coverImageUrl,
        liveUrl: data.liveUrl,
        repoUrl: data.repoUrl,
        role: data.role,
        year: data.year,
        yearRange: data.yearRange,
        years: data.years,
        category: data.category,
        featured: data.featured,
        order: data.order,
        tags: { connect: data.tagIds.map((id) => ({ id })) },
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
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function updateProject(
  id: string,
  _prevState: ProjectFormState,
  formData: FormData
): Promise<ProjectFormState> {
  await requireAdmin();
  let data: ReturnType<typeof parseProjectForm>;
  try {
    data = parseProjectForm(formData);
  } catch (e) {
    return { error: e instanceof z.ZodError ? e.issues[0].message : "Invalid form data." };
  }

  try {
    await prisma.$transaction([
      prisma.contentBlock.deleteMany({ where: { projectId: id } }),
      prisma.project.update({
        where: { id },
        data: {
          title: data.title,
          slug: data.slug,
          summary: data.summary,
          coverImageUrl: data.coverImageUrl,
          liveUrl: data.liveUrl,
          repoUrl: data.repoUrl,
          role: data.role,
          year: data.year,
          yearRange: data.yearRange,
          years: data.years,
          category: data.category,
          featured: data.featured,
          order: data.order,
          tags: { set: data.tagIds.map((tagId) => ({ id: tagId })) },
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
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath(`/projects/${data.slug}`);
  revalidatePath("/");
  redirect("/admin/projects");
}

export async function deleteProject(id: string) {
  await requireAdmin();
  await prisma.project.delete({ where: { id } });
  syncRagIndexAfterResponse();
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
}

export async function moveProject(id: string, direction: "up" | "down") {
  await requireAdmin();
  const target = await prisma.project.findUnique({
    where: { id },
    select: { category: true },
  });
  if (!target) return;

  // Scoped to the project's own category so commercial/personal projects
  // never swap into each other's group: matches the grouped display on
  // /admin/projects and /projects.
  const projects = await prisma.project.findMany({
    where: { category: target.category },
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true },
  });

  const index = projects.findIndex((p) => p.id === id);
  const targetIndex = direction === "up" ? index - 1 : index + 1;
  if (index === -1 || targetIndex < 0 || targetIndex >= projects.length) return;

  [projects[index], projects[targetIndex]] = [projects[targetIndex], projects[index]];

  await prisma.$transaction(
    projects.map((p, i) => prisma.project.update({ where: { id: p.id }, data: { order: i } }))
  );

  syncRagIndexAfterResponse();
  revalidatePath("/admin/projects");
  revalidatePath("/projects");
  revalidatePath("/");
}
