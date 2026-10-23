import "dotenv/config";
import { execSync } from "node:child_process";

import { PrismaClient } from "../src/generated/prisma/client";
import { embeddingsConfigured } from "../src/lib/ai-env";
import { createDbAdapter } from "../src/lib/db-adapter";

// Vercel runs `npm run vercel-build` instead of `npm run build` when it exists.
// Before building, it prepares the database so a fresh deploy works with no
// commands run by hand:
//   1. applies migrations (creates the tables and the vector extension)
//   2. loads the sample content from content/, only while the database is empty,
//      so it never overwrites or brings back what you changed in /admin
//   3. brings the chat's search index up to date (only new or changed text is
//      embedded, so a redeploy with no content changes costs nothing)
// Without DATABASE_URL it skips straight to the build.

function run(command: string, env: NodeJS.ProcessEnv = process.env) {
  console.log(`\n> ${command}`);
  execSync(command, { stdio: "inherit", env });
}

async function prepareDatabase() {
  // Migrations take a lock that a pooled connection can drop, so use the direct
  // URL when one exists (the Neon integration sets DATABASE_URL_UNPOOLED).
  const direct = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  run("npx prisma migrate deploy", { ...process.env, DATABASE_URL: direct });

  const prisma = new PrismaClient({ adapter: createDbAdapter() });
  try {
    if ((await prisma.project.count()) === 0) {
      run("npx prisma db seed");
    } else {
      console.log("\nContent found, skipping the sample content.");
    }
  } finally {
    await prisma.$disconnect();
  }

  if (!embeddingsConfigured()) {
    console.warn(
      "\nNo embedding provider (AI_API_KEY, or EMBEDDING_API_KEY): the AI features stay off and there is no search index until you set one and redeploy."
    );
    return;
  }
  try {
    run("npm run rag:ingest");
  } catch {
    // The site still works without the index; the chat answers once it is built.
    console.warn("\nBuilding the search index failed. Check AI_API_KEY (or EMBEDDING_API_KEY) and EMBEDDING_MODEL, then redeploy or run `npm run rag:ingest`.");
  }
}

async function main() {
  if (process.env.DATABASE_URL) {
    await prepareDatabase();
  } else {
    console.warn("DATABASE_URL is not set: skipping migrations, sample content and the search index.");
  }
  run("npm run build");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
