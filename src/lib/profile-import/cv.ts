// Reads a CV (or a LinkedIn "Save to PDF" export) to plain text.
// Same libraries as /api/parse-jd: unpdf for PDF, mammoth for .docx.
import mammoth from "mammoth";
import { extractText, getDocumentProxy } from "unpdf";

export const MAX_CV_BYTES = 5 * 1024 * 1024;
const MAX_CV_TEXT = 30_000;

export class CvReadError extends Error {}

export async function readCvBuffer(buffer: Buffer, fileName: string): Promise<string> {
  if (buffer.byteLength > MAX_CV_BYTES) throw new CvReadError("The CV file is too large (max 5 MB).");
  const name = fileName.toLowerCase();
  let text: string;
  try {
    if (name.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buffer));
      text = (await extractText(pdf, { mergePages: true })).text;
    } else if (name.endsWith(".docx")) {
      text = (await mammoth.extractRawText({ buffer })).value;
    } else if (name.endsWith(".txt") || name.endsWith(".md")) {
      text = buffer.toString("utf-8");
    } else if (name.endsWith(".doc")) {
      throw new CvReadError("Legacy .doc files are not supported. Save it as .docx or PDF.");
    } else {
      throw new CvReadError("Unsupported CV file type. Use a PDF, .docx or .txt file.");
    }
  } catch (err) {
    if (err instanceof CvReadError) throw err;
    throw new CvReadError("Could not read that CV file. It may be damaged or password protected.");
  }
  const clean = text.replace(/\r/g, "").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (!clean) throw new CvReadError("The CV file has no readable text (a scanned image cannot be read).");
  return clean.slice(0, MAX_CV_TEXT);
}
