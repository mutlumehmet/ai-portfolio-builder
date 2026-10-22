// Edits site.config.ts for the setup wizard. String fields are replaced in
// place; whole blocks (hero, home.stats, home.journey) are replaced only when
// their exact position can be found, and the result is parsed with the
// TypeScript compiler before it is accepted. If anything looks off, the block
// edits are skipped and the caller keeps the file with string edits only.
import ts from "typescript";

import {
  heroLiteral,
  journeyLiteral,
  pronounsFor,
  statsLiteral,
} from "../../src/lib/profile-import/config-snippet";
import type { ProfileDraft } from "../../src/lib/profile-import/schema";

// Replaces the string value of `key: "..."` (the first one in the file).
// JSON.stringify escapes quotes and backslashes, so any value stays a valid literal.
export function setString(source: string, key: string, value: string) {
  const pattern = new RegExp(`(\\b${key}:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
  if (!pattern.test(source)) throw new Error(`site.config.ts has no "${key}" field to update.`);
  return source.replace(pattern, (_m, lead: string) => `${lead}${JSON.stringify(value)}`);
}

/** Index just past the bracket that closes the one at `open`, skipping strings and comments. */
function matchingBracket(source: string, open: number) {
  const pairs: Record<string, string> = { "{": "}", "[": "]", "(": ")" };
  const stack: string[] = [];
  for (let i = open; i < source.length; i++) {
    const c = source[i];
    if (c === '"' || c === "'" || c === "`") {
      for (i++; i < source.length && source[i] !== c; i++) if (source[i] === "\\") i++;
      continue;
    }
    if (c === "/" && source[i + 1] === "/") {
      i = source.indexOf("\n", i);
      if (i === -1) return -1;
      continue;
    }
    if (c === "/" && source[i + 1] === "*") {
      i = source.indexOf("*/", i + 2) + 1;
      if (i === 0) return -1;
      continue;
    }
    if (pairs[c]) stack.push(pairs[c]);
    else if (c === "}" || c === "]" || c === ")") {
      if (stack.pop() !== c) return -1;
      if (stack.length === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * Replaces the value of the property `key` written at exactly `indent` spaces,
 * inside the block that starts at `from`. The value must be an object or array.
 */
function replaceBlock(source: string, key: string, indent: number, literal: string, from = 0) {
  const pattern = new RegExp(`\\n {${indent}}${key}:\\s*`, "g");
  pattern.lastIndex = from;
  const m = pattern.exec(source);
  if (!m) return null;
  const start = m.index + m[0].length;
  if (source[start] !== "{" && source[start] !== "[") return null;
  const end = matchingBracket(source, start);
  if (end === -1) return null;
  return source.slice(0, start) + literal + source.slice(end);
}

function parsesCleanly(source: string) {
  const out = ts.transpileModule(source, { reportDiagnostics: true, compilerOptions: { module: ts.ModuleKind.ESNext } });
  return (out.diagnostics ?? []).length === 0;
}

/** Writes the hero, stats, journey and SEO text of an approved draft. Returns the new source and what was written. */
export function applyDraftBlocks(source: string, draft: ProfileDraft) {
  let next = source;
  const written: string[] = [];
  const skipped: string[] = [];

  const tryBlock = (label: string, edit: (s: string) => string | null) => {
    const candidate = edit(next);
    if (candidate && parsesCleanly(candidate)) {
      next = candidate;
      written.push(label);
    } else {
      skipped.push(label);
    }
  };

  // An empty hero or journey in the draft leaves the current one in place;
  // empty stats replace the sample numbers, which hides the section.
  const h = draft.hero;
  const hasHero = Boolean(h.headlineBefore || h.headlineHighlight || h.headlineAfter || h.paragraphs.length);
  const hasJourney = Boolean(draft.journey.heading || draft.journey.steps.length);
  if (hasHero) tryBlock("hero", (s) => replaceBlock(s, "hero", 2, heroLiteral(draft, 2)));
  const home = /\n {2}home:\s*\{/.exec(next)?.index ?? -1;
  if (home >= 0) {
    tryBlock("stats", (s) => replaceBlock(s, "stats", 4, statsLiteral(draft, 4), home));
    if (hasJourney) tryBlock("journey", (s) => replaceBlock(s, "journey", 4, journeyLiteral(draft, 4), home));
  } else {
    skipped.push("stats", ...(hasJourney ? ["journey"] : []));
  }
  for (const key of ["description", "tagline"] as const) {
    const value = draft.seo[key];
    if (!value) continue;
    tryBlock(`seo.${key}`, (s) => {
      const seo = /\n {2}seo:\s*\{/.exec(s);
      if (!seo) return null;
      const end = matchingBracket(s, seo.index + seo[0].length - 1);
      if (end === -1) return null;
      const block = s.slice(seo.index, end);
      const pattern = new RegExp(`(\\n {4}${key}:\\s*)"(?:[^"\\\\]|\\\\.)*"`);
      if (!pattern.test(block)) return null;
      return s.slice(0, seo.index) + block.replace(pattern, (_m, lead: string) => `${lead}${JSON.stringify(value)}`) + s.slice(end);
    });
  }
  return { source: next, written, skipped };
}

/** Every field of a draft: the string fields, pronouns (when stated) and the blocks. Empty values are left as they are. */
export function applyDraftToConfig(source: string, draft: ProfileDraft) {
  let next = source;
  const p = draft.person;
  const strings: [string, string][] = [
    ["name", p.name],
    ["initials", p.initials],
    ["firstName", p.firstName],
    ["role", p.role],
    ["location", p.location],
    ["oneLiner", p.oneLiner],
    ["email", draft.contact.email],
    ["linkedin", draft.socials.linkedin],
    ["github", draft.socials.github],
    ["title", draft.seo.title],
  ];
  for (const [key, value] of strings) if (value) next = setString(next, key, value);
  if (p.pronouns) {
    const pr = pronounsFor(p.pronouns);
    next = next.replace(
      /pronouns:\s*\{[^}]*\}/,
      `pronouns: { subject: "${pr.subject}", object: "${pr.object}", possessive: "${pr.possessive}" }`
    );
  }
  return applyDraftBlocks(next, draft);
}
