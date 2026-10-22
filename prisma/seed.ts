// Loads the content in content/ into the database:
//   content/projects/*.json  one project per file (shape: scripts/example-project.json)
//   content/experience.json  roles for /experience
//   content/faqs.json        question and answer pairs
//
// Safe to run again: projects and roles are upserted by slug, FAQs are replaced.
// Run `npm run rag:ingest` afterwards to build the chat's search index.
import "dotenv/config";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { z } from "zod";

import { PrismaClient } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { upsertProject } from "../scripts/lib/upsert";

const prisma = new PrismaClient({ adapter: createDbAdapter() });
const CONTENT = join(process.cwd(), "content");

const experienceSchema = z.array(
  z.object({
    slug: z.string().regex(/^[a-z0-9-]+$/),
    title: z.string().min(1),
    company: z.string().min(1),
    location: z.string().optional(),
    startDate: z.iso.date(),
    endDate: z.iso.date().nullable().optional(),
    highlights: z.array(z.string()).default([]),
  })
);

const faqSchema = z.array(z.object({ question: z.string().min(1), answer: z.string().min(1) }));

function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf-8"));
}

async function seedProjects() {
  const dir = join(CONTENT, "projects");
  const files = readdirSync(dir).filter((f) => f.endsWith(".json")).sort();
  for (const file of files) {
    const { project, created } = await upsertProject(prisma, readJson(join(dir, file)));
    console.log(`${created ? "Created" : "Updated"} project /${project.slug}`);
  }
}

async function seedExperience() {
  const roles = experienceSchema.parse(readJson(join(CONTENT, "experience.json")));
  for (const [order, role] of roles.entries()) {
    const fields = {
      title: role.title,
      company: role.company,
      location: role.location ?? null,
      startDate: new Date(role.startDate),
      endDate: role.endDate ? new Date(role.endDate) : null,
      order,
    };
    const blocks = role.highlights.map((text, i) => ({
      order: i,
      type: "paragraph" as const,
      data: { text },
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
    console.log(`Saved role ${role.title} at ${role.company}`);
  }
}

async function seedFaqs() {
  const faqs = faqSchema.parse(readJson(join(CONTENT, "faqs.json")));
  await prisma.$transaction([
    prisma.faq.deleteMany(),
    prisma.faq.createMany({ data: faqs.map((f, order) => ({ ...f, order })) }),
  ]);
  console.log(`Saved ${faqs.length} FAQs`);
}

async function main() {
  await seedProjects();
  await seedExperience();
  await seedFaqs();
  console.log("\nDone. Now run `npm run rag:ingest` to build the chat's search index.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
