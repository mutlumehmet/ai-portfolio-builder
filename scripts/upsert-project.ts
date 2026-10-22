/**
 * Create or update a Project (with tags and content blocks) straight from a
 * JSON file, with no admin form needed. Handy for scripting, or for an AI
 * coding agent adding projects from a conversation.
 *
 * Usage:
 *   npm run project:upsert -- path/to/project.json
 *
 * See scripts/example-project.json for the expected shape.
 */
import "dotenv/config";
import { readFileSync } from "fs";

import { PrismaClient } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { syncRagIndex } from "../src/lib/rag-sync";
import { upsertProject } from "./lib/upsert";

const prisma = new PrismaClient({ adapter: createDbAdapter() });

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: npm run project:upsert -- path/to/project.json");
    process.exit(1);
  }

  const raw = JSON.parse(readFileSync(filePath, "utf-8"));
  const { project, created } = await upsertProject(prisma, raw);
  console.log(`${created ? "Created" : "Updated"} project "${project.title}" (/${project.slug})`);
  // Keep the chat's RAG index in step (incremental: only changed text is embedded).
  await syncRagIndex(prisma, { log: console.log });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
