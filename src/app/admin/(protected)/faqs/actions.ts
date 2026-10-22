"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { syncRagIndexAfterResponse } from "@/lib/rag-sync-after";

export type FaqFormState = {
  error: string | null;
};

const faqFormSchema = z.object({
  question: z.string().min(1, "Question is required."),
  answer: z.string().min(1, "Answer is required."),
});

function revalidateFaqPaths() {
  syncRagIndexAfterResponse();
  revalidatePath("/admin/faqs");
  revalidatePath("/");
}

export async function createFaq(
  _prevState: FaqFormState,
  formData: FormData
): Promise<FaqFormState> {
  await requireAdmin();
  const parsed = faqFormSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const maxOrder = await prisma.faq.aggregate({ _max: { order: true } });

  await prisma.faq.create({
    data: {
      ...parsed.data,
      order: (maxOrder._max.order ?? -1) + 1,
    },
  });

  revalidateFaqPaths();
  return { error: null };
}

export async function updateFaq(
  id: string,
  _prevState: FaqFormState,
  formData: FormData
): Promise<FaqFormState> {
  await requireAdmin();
  const parsed = faqFormSchema.safeParse({
    question: formData.get("question"),
    answer: formData.get("answer"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  await prisma.faq.update({ where: { id }, data: parsed.data });

  revalidateFaqPaths();
  return { error: null };
}

export async function deleteFaq(id: string) {
  await requireAdmin();
  await prisma.faq.delete({ where: { id } });
  revalidateFaqPaths();
}

export async function moveFaq(id: string, direction: "up" | "down") {
  await requireAdmin();
  const faqs = await prisma.faq.findMany({ orderBy: { order: "asc" } });
  const index = faqs.findIndex((f) => f.id === id);
  const swapWith = direction === "up" ? index - 1 : index + 1;

  if (index === -1 || swapWith < 0 || swapWith >= faqs.length) return;

  const a = faqs[index];
  const b = faqs[swapWith];

  await prisma.$transaction([
    prisma.faq.update({ where: { id: a.id }, data: { order: b.order } }),
    prisma.faq.update({ where: { id: b.id }, data: { order: a.order } }),
  ]);

  revalidateFaqPaths();
}
