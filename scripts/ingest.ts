import "dotenv/config";

import { PrismaClient } from "../src/generated/prisma/client";
import { createDbAdapter } from "../src/lib/db-adapter";
import { syncRagIndex } from "../src/lib/rag-sync";

// Brings the chat's RAG index in step with the content. Incremental: only new or
// changed text is embedded (see src/lib/rag-sync.ts). `--full` re-embeds everything,
// for a change of embedding model or chunk format.
// The upsert, delete and seed scripts and the admin actions already run this after
// every write, so this command is for a manual check or a full rebuild.
const prisma = new PrismaClient({ adapter: createDbAdapter() });

syncRagIndex(prisma, { full: process.argv.includes("--full"), log: console.log })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
