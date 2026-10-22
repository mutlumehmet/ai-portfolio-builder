import { after } from "next/server";

import { prisma } from "@/lib/prisma";
import { syncRagIndex } from "@/lib/rag-sync";

// For admin Server Actions: re-sync the chat's RAG index once the response is sent,
// so saving a form never waits on OpenAI. Incremental, and a no-op read when the
// write did not change any indexed text (a reorder, for example).
export function syncRagIndexAfterResponse() {
  after(async () => {
    try {
      const r = await syncRagIndex(prisma);
      if (r.written) console.log(`RAG index synced: ${r.embedded} embedded, ${r.reused} reused, ${r.removed} removed.`);
    } catch (err) {
      console.error("RAG index sync failed", err);
    }
  });
}
