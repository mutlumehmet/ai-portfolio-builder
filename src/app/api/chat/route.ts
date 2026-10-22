import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/lib/config";
import { answerChatQuestion } from "@/lib/rag";
import { aiRequestAllowed, featureOff, readJson, tooManyRequests } from "@/lib/rate-limit";

const bodySchema = z.object({
  message: z.string().trim().min(1).max(2000),
});

export async function POST(request: Request) {
  if (!features.chat) return featureOff();
  if (!aiRequestAllowed(request)) return tooManyRequests();

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  try {
    const answer = await answerChatQuestion(parsed.data.message);
    return NextResponse.json({ answer });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong answering that." },
      { status: 500 }
    );
  }
}
