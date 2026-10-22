/**
 * Delete a project by slug.
 * Usage: npm run project:delete -- my-project-slug
 */
import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { syncRagIndex } from "../src/lib/rag-sync";

const prisma = new PrismaClient({ adapter: createDbAdapter() });

async function main() {
  const slug = process.argv[2];
  if (!slug) {
    console.error("Usage: npm run project:delete -- my-project-slug");
    process.exit(1);
  }

  const deleted = await prisma.project.delete({ where: { slug } });
  console.log(`Deleted project "${deleted.title}" (/${deleted.slug})`);
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
