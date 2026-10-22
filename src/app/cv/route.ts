import { readFile } from "fs/promises";
import path from "path";

import { NextResponse } from "next/server";

import { features, siteConfig } from "@/lib/config";

export async function GET() {
  if (!features.cv) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Only a plain file name inside public/ is accepted.
  const fileName = path.basename(siteConfig.cv.file);
  const filePath = path.join(process.cwd(), "public", fileName);

  try {
    const file = await readFile(filePath);
    const date = new Date()
      .toLocaleString("en-US", { month: "long", year: "numeric" })
      .replace(" ", "-");
    const filename = siteConfig.cv.downloadName.replace("{date}", date).replace(/[^\w.-]+/g, "-");
    return new NextResponse(new Uint8Array(file), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch {
    return NextResponse.json(
      { error: `CV not uploaded yet. Put a PDF at public/${fileName} to enable this route.` },
      { status: 404 }
    );
  }
}
