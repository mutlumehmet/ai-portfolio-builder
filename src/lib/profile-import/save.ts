// Database writes shared by the seed script and /admin/import.
import type { Prisma, PrismaClient } from "@/generated/prisma/client";

import { upsertProject } from "../../../scripts/lib/upsert";
import { SAMPLE_EXPERIENCE_SLUGS, SAMPLE_FAQ_QUESTIONS, SAMPLE_PROJECT_SLUGS } from "./samples";
import { savableProjects, toExperienceJson, toFaqsJson, toProjectJson, type ProfileDraft } from "./schema";

// The content/experience.json shape.
export type ExperienceRole = {
  slug: string;
  title: string;
  company: string;
  location?: string | null;
  startDate: string;
  endDate?: string | null;
  highlights: string[];
};

/** Creates or updates roles by slug, replacing their highlight blocks. */
export async function upsertExperienceRoles(prisma: PrismaClient, roles: ExperienceRole[], firstOrder = 0) {
  for (const [i, role] of roles.entries()) {
    const fields = {
      title: role.title,
      company: role.company,
      location: role.location ?? null,
      startDate: new Date(role.startDate),
      endDate: role.endDate ? new Date(role.endDate) : null,
      order: firstOrder + i,
    };
    const blocks = role.highlights.map((text, order) => ({
      order,
      type: "paragraph" as const,
      data: { text } as Prisma.InputJsonValue,
    }));
    await prisma.$transaction(async (tx) => {
      const existing = await tx.experience.findUnique({ where: { slug: role.slug } });
      if (existing) await tx.experienceBlock.deleteMany({ where: { experienceId: existing.id } });
      await tx.experience.upsert({
        where: { slug: role.slug },
        update: { ...fields, blocks: { create: blocks } },
        create: { slug: role.slug, ...fields, blocks: { create: blocks } },
      });
    });
  }
}

/** Deletes the sample persona's projects, roles and FAQs; leaves everything else alone. */
export async function removeSampleContent(prisma: PrismaClient) {
  const [projects, roles, faqs] = await prisma.$transaction([
    prisma.project.deleteMany({ where: { slug: { in: SAMPLE_PROJECT_SLUGS } } }),
    prisma.experience.deleteMany({ where: { slug: { in: SAMPLE_EXPERIENCE_SLUGS } } }),
    prisma.faq.deleteMany({ where: { question: { in: SAMPLE_FAQ_QUESTIONS } } }),
  ]);
  return { projects: projects.count, roles: roles.count, faqs: faqs.count };
}

export type SaveSelection = {
  experience: boolean;
  faqs: boolean;
  /** Slugs of the projects to save. */
  projects: string[];
  removeSamples: boolean;
};

/** Writes the chosen parts of a draft to the database. FAQs are added after the existing ones. */
export async function saveDraftToDatabase(prisma: PrismaClient, draft: ProfileDraft, pick: SaveSelection) {
  const removed = pick.removeSamples ? await removeSampleContent(prisma) : null;

  const chosen = savableProjects(draft.projects).filter((p) => pick.projects.includes(p.slug));
  for (const [i, p] of chosen.entries()) await upsertProject(prisma, toProjectJson(p, (i + 1) * 10));

  let roles = 0;
  if (pick.experience) {
    const list = toExperienceJson(draft.experience);
    const max = await prisma.experience.aggregate({ _max: { order: true } });
    await upsertExperienceRoles(prisma, list, (max._max.order ?? -1) + 1);
    roles = list.length;
  }

  let faqs = 0;
  if (pick.faqs) {
    const list = toFaqsJson(draft.faqs);
    const max = await prisma.faq.aggregate({ _max: { order: true } });
    const start = (max._max.order ?? -1) + 1;
    await prisma.faq.createMany({ data: list.map((f, i) => ({ ...f, order: start + i })) });
    faqs = list.length;
  }

  return { removed, projects: chosen.length, roles, faqs };
}
