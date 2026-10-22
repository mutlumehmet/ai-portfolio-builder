import { prisma } from "@/lib/prisma";

import { FaqForm } from "./faq-form";
import { FaqList } from "./faq-list";

export default async function AdminFaqsPage() {
  const faqs = await prisma.faq.findMany({
    orderBy: { order: "asc" },
    select: { id: true, question: true, answer: true, order: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">FAQ</h1>
        <p className="mt-1 text-muted-foreground">
          Shown on the homepage, and used as context by the chat, the fit
          check and the MCP server.
        </p>
      </div>

      <div className="mb-8">
        <FaqForm />
      </div>

      <FaqList faqs={faqs} />
    </div>
  );
}
