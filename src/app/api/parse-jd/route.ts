import mammoth from "mammoth";
import { NextResponse } from "next/server";
// unpdf, not pdf-parse: pdf-parse's underlying pdfjs-dist tries to spin up a
// worker thread whose bundled path Turbopack can't resolve under a Next.js
// Route Handler ("Setting up fake worker failed"). unpdf is built
// specifically for serverless/edge (Vercel, Lambda, Workers) and avoids
// that entirely.
import { extractText, getDocumentProxy } from "unpdf";

import { features } from "@/lib/config";
import { aiRequestAllowed, featureOff, tooManyRequests } from "@/lib/rate-limit";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5MB: a job description is never legitimately bigger than this
// The fit check accepts at most 8,000 characters, so longer text is cut here.
const MAX_TEXT = 8000;

function textResponse(text: string) {
  return NextResponse.json({ text: text.trim().slice(0, MAX_TEXT) });
}

export async function POST(request: Request) {
  if (!features.parseJd) return featureOff();
  if (!aiRequestAllowed(request)) return tooManyRequests();

  // Reject oversized uploads from the header before reading the body into memory.
  const declaredLength = Number(request.headers.get("content-length") ?? 0);
  if (declaredLength > MAX_BYTES + 64 * 1024) {
    return NextResponse.json({ error: "File is too large (max 5MB)." }, { status: 413 });
  }

  let file: FormDataEntryValue | null;
  try {
    file = (await request.formData()).get("file");
  } catch {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is too large (max 5MB)." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const name = file.name.toLowerCase();

  try {
    if (name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      const { text } = await extractText(pdf, { mergePages: true });
      return textResponse(text);
    }

    if (name.endsWith(".docx")) {
      const result = await mammoth.extractRawText({ buffer });
      return textResponse(result.value);
    }

    if (name.endsWith(".doc")) {
      return NextResponse.json(
        {
          error:
            "Legacy .doc files aren't supported. Please save as .docx or PDF and try again.",
        },
        { status: 400 }
      );
    }

    if (name.endsWith(".txt")) {
      return textResponse(buffer.toString("utf-8"));
    }

    return NextResponse.json(
      { error: "Unsupported file type. Upload a PDF, .docx, or .txt file." },
      { status: 400 }
    );
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Couldn't read that file. It may be corrupted or password-protected." },
      { status: 500 }
    );
  }
}
