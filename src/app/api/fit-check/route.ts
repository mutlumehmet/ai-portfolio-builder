import { NextResponse } from "next/server";
import { z } from "zod";

import { features } from "@/lib/config";
import { checkJobFit } from "@/lib/rag";
import { aiRequestAllowed, featureOff, readJson, tooManyRequests } from "@/lib/rate-limit";

const bodySchema = z.object({
  jobDescription: z.string().trim().min(20).max(8000),
});

export async function POST(request: Request) {
  if (!features.fitCheck) return featureOff();
  if (!aiRequestAllowed(request)) return tooManyRequests();

  const parsed = bodySchema.safeParse(await readJson(request));
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Paste a job description between 20 and 8,000 characters." },
      { status: 400 }
    );
  }

  try {
    const result = await checkJobFit(parsed.data.jobDescription);
    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Something went wrong analyzing that." },
      { status: 500 }
    );
  }
}
