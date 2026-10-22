// Shared by scripts/upsert-project.ts and prisma/seed.ts: validate a project
// JSON file (see scripts/example-project.json) and write it with its tags and
// content blocks.
import { z } from "zod";

import { blockDataSchemas, type BlockType } from "../../src/lib/blocks";
import type { Prisma, PrismaClient } from "../../src/generated/prisma/client";

const tagSchema = z.object({
  name: z.string().min(1),
  kind: z.enum(["technology", "industry"]),
});

const blockSchema = z.object({
  type: z.enum(["heading", "paragraph", "image", "youtube", "diagram", "code", "embed"]),
  data: z.record(z.string(), z.unknown()),
});

export const projectSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "slug must be lowercase letters, numbers, and dashes"),
  title: z.string().min(1),
  summary: z.string().min(1),
  coverImageUrl: z.string().optional(),
  liveUrl: z.string().optional(),
  repoUrl: z.string().optional(),
  role: z.string().optional(),
  year: z.number().int().optional(),
  yearRange: z.string().optional(),
  years: z.array(z.number().int()).default([]),
  category: z.enum(["commercial", "personal"]).default("commercial"),
  featured: z.boolean().default(true),
  order: z.number().int().default(0),
  tags: z.array(tagSchema).default([]),
  blocks: z.array(blockSchema).default([]),
});

export function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function upsertProject(prisma: PrismaClient, raw: unknown) {
  const data = projectSchema.parse(raw);

  // Validate each block's `data` shape against its type-specific schema
  // (same validation the admin form's server action applies).
  for (const block of data.blocks) {
    blockDataSchemas[block.type as BlockType].parse(block.data);
  }

  // Ensure every referenced tag exists (create if new), then collect ids.
  const tagIds: string[] = [];
  for (const tag of data.tags) {
    const slug = slugify(tag.name);
    const row = await prisma.tag.upsert({
      where: { slug },
      update: {},
      create: { name: tag.name, slug, kind: tag.kind },
    });
    tagIds.push(row.id);
  }

  const existing = await prisma.project.findUnique({ where: { slug: data.slug } });

  const project = await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.contentBlock.deleteMany({ where: { projectId: existing.id } });
    }

    return tx.project.upsert({
      where: { slug: data.slug },
      update: {
        title: data.title,
        summary: data.summary,
        // Coalesce to null (not undefined) on update: Prisma silently skips
        // `undefined` fields, so an omitted optional field would otherwise
        // leave whatever value was already in the DB instead of clearing it.
        coverImageUrl: data.coverImageUrl ?? null,
        liveUrl: data.liveUrl ?? null,
        repoUrl: data.repoUrl ?? null,
        role: data.role ?? null,
        year: data.year ?? null,
        yearRange: data.yearRange ?? null,
        years: data.years,
        category: data.category,
        featured: data.featured,
        order: data.order,
        tags: { set: tagIds.map((id) => ({ id })) },
        blocks: {
          create: data.blocks.map((b, i) => ({
            order: i,
            type: b.type,
            data: b.data as Prisma.InputJsonValue,
          })),
        },
      },
      create: {
        slug: data.slug,
        title: data.title,
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
        tags: { connect: tagIds.map((id) => ({ id })) },
        blocks: {
          create: data.blocks.map((b, i) => ({
            order: i,
            type: b.type,
            data: b.data as Prisma.InputJsonValue,
          })),
        },
      },
    });
  });

  return { project, created: !existing };
}
