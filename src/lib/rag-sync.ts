import { randomUUID } from "crypto";

import OpenAI from "openai";

import { Prisma, type PrismaClient } from "@/generated/prisma/client";
import { parseBlockData, type BlockType } from "@/lib/blocks";
import { embeddingModel } from "@/lib/config";

// Keeps the chat's pgvector index in step with the content. Called after every
// content write (the upsert/delete/seed scripts and the admin actions), and by
// `npm run rag:ingest`.
//
// Incremental: a chunk whose text is unchanged keeps its stored embedding, so
// only new or edited text goes to OpenAI. When the set of chunks is exactly the
// same as the stored one, nothing is written at all. When something changed,
// the whole table is still swapped in one transaction, so visitors never see a
// half-built index and removed content disappears with it.

type PendingChunk = { sourceType: string; sourceId: string; content: string };

export type RagSyncResult = {
  total: number;
  embedded: number;
  reused: number;
  removed: number;
  written: boolean;
};

// Only block types that carry meaningful standalone text are worth
// embedding: image/youtube/diagram/code blocks are visual or reference
// content, not something a visitor would ask a question about in words.
// heading is deliberately excluded too: short generic labels like
// "Overview" or "Admin" embed as near-universal matches for
// text-embedding-3-small (they're close to almost any query about
// the site owner), which crowded real project/experience chunks out of the
// top-5 retrieval entirely. The substance a heading introduces is
// already captured in its adjacent paragraph block.
const TEXT_BLOCK_TYPES: BlockType[] = ["paragraph"];

function textFromBlock(type: string, data: unknown): string | null {
  if (!TEXT_BLOCK_TYPES.includes(type as BlockType)) return null;
  const parsed = parseBlockData(type as "heading" | "paragraph", data);
  return parsed.text;
}

async function collectChunks(prisma: PrismaClient): Promise<PendingChunk[]> {
  const [projects, experiences, faqs] = await Promise.all([
    prisma.project.findMany({ include: { blocks: { orderBy: { order: "asc" } }, tags: true } }),
    prisma.experience.findMany({ include: { blocks: { orderBy: { order: "asc" } } } }),
    prisma.faq.findMany(),
  ]);

  const chunks: PendingChunk[] = [];
  for (const project of projects) {
    const tagNames = project.tags.map((t) => t.name).join(", ");
    chunks.push({
      sourceType: "project",
      sourceId: project.id,
      content: `Project: ${project.title} (${project.role ?? "Contributor"}, ${project.year ?? ""}). ${project.summary} Technologies/industry: ${tagNames}.`,
    });
    for (const block of project.blocks) {
      const text = textFromBlock(block.type, block.data);
      if (text) chunks.push({ sourceType: "project", sourceId: project.id, content: `${project.title}: ${text}` });
    }
  }

  for (const exp of experiences) {
    const period = `${exp.startDate.getUTCFullYear()} to ${exp.endDate ? exp.endDate.getUTCFullYear() : "now"}`;
    chunks.push({
      sourceType: "experience",
      sourceId: exp.id,
      content: `Role: ${exp.title} at ${exp.company} (${period}${exp.location ? `, ${exp.location}` : ""}).`,
    });
    for (const block of exp.blocks) {
      const text = textFromBlock(block.type, block.data);
      if (text) chunks.push({ sourceType: "experience", sourceId: exp.id, content: `${exp.title} at ${exp.company}: ${text}` });
    }
  }

  for (const faq of faqs) {
    chunks.push({ sourceType: "faq", sourceId: faq.id, content: `Q: ${faq.question}\nA: ${faq.answer}` });
  }
  return chunks;
}

// The identity of a chunk for "did anything change": where it comes from and its text.
const keyOf = (c: { sourceType: string; sourceId: string | null; content: string }) =>
  `${c.sourceType}\u0000${c.sourceId ?? ""}\u0000${c.content}`;

// Embedding requests accept a batch of inputs; 100 per call keeps each
// request well under the API's size limits.
const EMBED_BATCH = 100;
// Rows per INSERT statement when writing the new index.
const INSERT_BATCH = 100;

export async function syncRagIndex(
  prisma: PrismaClient,
  opts: { full?: boolean; log?: (line: string) => void } = {},
): Promise<RagSyncResult> {
  const log = opts.log ?? (() => {});
  const pending = await collectChunks(prisma);

  // What is stored now: each chunk's identity, and each text's vector (pgvector prints
  // a vector as "[0.1,0.2,...]", the same literal it accepts back).
  const stored = await prisma.$queryRaw<{ sourceType: string; sourceId: string | null; content: string; v: string }[]>`
    SELECT "sourceType", "sourceId", content, embedding::text AS v FROM "Chunk" WHERE embedding IS NOT NULL
  `;
  const vectorByText = new Map<string, string>();
  if (!opts.full) for (const s of stored) vectorByText.set(s.content, s.v);

  const before = stored.map(keyOf).sort();
  const after = pending.map(keyOf).sort();
  const same = !opts.full && before.length === after.length && before.every((k, i) => k === after[i]);
  if (same) {
    log(`RAG index up to date (${pending.length} chunks), nothing written.`);
    return { total: pending.length, embedded: 0, reused: pending.length, removed: 0, written: false };
  }

  // Embed only the texts with no stored vector, before touching the live index:
  // if this fails, the chat keeps answering from the old one.
  const missing = [...new Set(pending.map((c) => c.content).filter((t) => !vectorByText.has(t)))];
  if (missing.length > 0 && !process.env.OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY is not set, so the RAG index cannot be built. Set it, then run `npm run rag:ingest`.");
  }
  for (let i = 0; i < missing.length; i += EMBED_BATCH) {
    const batch = missing.slice(i, i + EMBED_BATCH);
    const res = await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).embeddings.create({ model: embeddingModel, input: batch });
    res.data.forEach((d, j) => vectorByText.set(batch[j], `[${d.embedding.join(",")}]`));
    log(`  embedded ${Math.min(i + EMBED_BATCH, missing.length)}/${missing.length}`);
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.$executeRaw`DELETE FROM "Chunk"`;
      for (let i = 0; i < pending.length; i += INSERT_BATCH) {
        const values = pending.slice(i, i + INSERT_BATCH).map(
          (c) => Prisma.sql`(${randomUUID()}, ${c.sourceType}, ${c.sourceId}, ${c.content}, ${vectorByText.get(c.content)!}::vector, now())`,
        );
        await tx.$executeRaw`
          INSERT INTO "Chunk" (id, "sourceType", "sourceId", content, embedding, "createdAt")
          VALUES ${Prisma.join(values)}
        `;
      }
    },
    { timeout: 60_000 },
  );

  const afterSet = new Set(after);
  const result = {
    total: pending.length,
    embedded: missing.length,
    reused: pending.length - pending.filter((c) => missing.includes(c.content)).length,
    removed: before.filter((k) => !afterSet.has(k)).length,
    written: true,
  };
  log(`RAG index synced: ${result.total} chunks, ${result.embedded} embedded, ${result.reused} reused, ${result.removed} removed.`);
  return result;
}
