// Best-effort read of a public LinkedIn profile page.
//
// One GET with a normal browser User-Agent, no cookies, no login, no retries.
// LinkedIn often answers automated requests with HTTP 999 or a sign-in wall;
// that is reported as a failure with a reason, so the caller can ask for the
// "Save to PDF" export instead. It is never skipped silently.

const TIMEOUT_MS = 10_000;
const MAX_BYTES = 3 * 1024 * 1024;
const MAX_TEXT = 15_000;
const MIN_TEXT = 300;

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36";

export const LINKEDIN_PDF_HINT =
  "On LinkedIn open your profile, More, Save to PDF, and give that PDF as your CV file instead.";

export type LinkedInResult =
  | { status: "ok"; url: string; text: string }
  | { status: "failed"; url: string; reason: string };

/** The message every caller shows when the profile could not be read. */
export function linkedInFailureMessage(reason: string) {
  return `We could not read your LinkedIn profile (${reason}). ${LINKEDIN_PDF_HINT}`;
}

/** Accepts linkedin.com/in/<name> with or without https:// and www., returns a clean URL or null. */
export function normaliseLinkedInUrl(input: string): string | null {
  const raw = input.trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  if (!/^([a-z]{2,3}\.)?(www\.)?linkedin\.com$/i.test(url.hostname)) return null;
  const match = url.pathname.match(/^\/in\/([^/]+)\/?$/);
  if (!match) return null;
  return `https://www.linkedin.com/in/${match[1]}`;
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "-",
  mdash: "-",
  middot: "·",
  hellip: "...",
};

export function decodeEntities(text: string) {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] === "#") {
      const n = code[1].toLowerCase() === "x" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : " ";
    }
    return ENTITIES[code.toLowerCase()] ?? whole;
  });
}

/** Turns an HTML page into readable text: scripts, styles and tags removed, whitespace collapsed. */
export function htmlToText(html: string) {
  const body = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template|iframe)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/section|\/tr)\b[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(body)
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

// Public profile pages carry JSON-LD that describes the person (job titles,
// employers, schools), next to posts and articles. Only the Person entries are
// kept. It sits in a script tag, so it is read before scripts are stripped.
function jsonLdPeople(html: string) {
  const people: unknown[] = [];
  for (const m of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const data = JSON.parse(m[1]) as Record<string, unknown>;
      const nodes = Array.isArray(data["@graph"]) ? (data["@graph"] as Record<string, unknown>[]) : [data];
      for (const node of nodes) if (node && node["@type"] === "Person") people.push(node);
    } catch {
      // ignore malformed blocks
    }
  }
  return people.length ? JSON.stringify(people).slice(0, 6_000) : "";
}

function pageTitle(html: string) {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m ? decodeEntities(m[1]).replace(/\s+/g, " ").trim() : "";
}

async function readCapped(res: Response) {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BYTES) {
      await reader.cancel();
      break;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks).toString("utf-8");
}

/** Checks an already fetched page. Exported so it can be tested without a network call. */
export function judgeLinkedInPage(url: string, finalUrl: string, html: string): LinkedInResult {
  const title = pageTitle(html);
  if (/\/(authwall|login|signup|checkpoint|uas\/login)/i.test(new URL(finalUrl).pathname)) {
    return { status: "failed", url, reason: "LinkedIn asked for a sign-in" };
  }
  if (/sign ?up|log ?in|sign ?in|security verification|authwall/i.test(title)) {
    return { status: "failed", url, reason: "LinkedIn showed a sign-in page instead of the profile" };
  }
  const ld = jsonLdPeople(html);
  const text = htmlToText(html);
  const hasPerson = ld !== "";
  const hasExperience = /\b(Experience|Education|About)\b/.test(text);
  if (text.length < MIN_TEXT || (!hasPerson && !hasExperience)) {
    return { status: "failed", url, reason: "the page had too little profile text" };
  }
  const combined = [title && `Page title: ${title}`, ld && `Profile data: ${ld}`, `Page text:\n${text}`]
    .filter(Boolean)
    .join("\n\n");
  return { status: "ok", url, text: combined.slice(0, MAX_TEXT) };
}

export async function fetchLinkedInProfile(input: string): Promise<LinkedInResult> {
  const url = normaliseLinkedInUrl(input);
  if (!url) {
    return {
      status: "failed",
      url: input,
      reason: "that is not a LinkedIn profile URL like https://www.linkedin.com/in/your-name",
    };
  }

  let res: Response;
  try {
    res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml",
        "Accept-Language": "en-GB,en;q=0.9",
      },
      cache: "no-store",
    });
  } catch (err) {
    const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
    return { status: "failed", url, reason: timedOut ? "LinkedIn did not answer within 10 seconds" : "the request failed" };
  }

  if (res.status === 999) {
    await res.body?.cancel();
    return { status: "failed", url, reason: "LinkedIn blocked the request (HTTP 999)" };
  }
  if (res.status !== 200) {
    await res.body?.cancel();
    return { status: "failed", url, reason: `LinkedIn answered HTTP ${res.status}` };
  }

  const html = await readCapped(res);
  return judgeLinkedInPage(url, res.url || url, html);
}
