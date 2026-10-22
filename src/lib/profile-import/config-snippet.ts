// Turns a draft into site.config.ts text. Pure functions, used by the setup
// wizard (which writes the file) and by /admin/import (which shows a snippet
// to paste, because a deployed site cannot change its own source).
import type { ProfileDraft } from "./schema";

const IDENT = /^[A-Za-z_$][\w$]*$/;

/** A TypeScript literal for plain JSON data, with unquoted keys, indented to `indent` spaces. */
export function tsLiteral(value: unknown, indent = 0): string {
  const pad = " ".repeat(indent);
  const inner = " ".repeat(indent + 2);
  if (Array.isArray(value)) {
    if (value.length === 0) return "[]";
    return `[\n${value.map((v) => `${inner}${tsLiteral(v, indent + 2)},`).join("\n")}\n${pad}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value).filter(([, v]) => v !== undefined);
    if (entries.length === 0) return "{}";
    return `{\n${entries
      .map(([k, v]) => `${inner}${IDENT.test(k) ? k : JSON.stringify(k)}: ${tsLiteral(v, indent + 2)},`)
      .join("\n")}\n${pad}}`;
  }
  return JSON.stringify(value ?? "");
}

const PRONOUNS = {
  she: { subject: "she", object: "her", possessive: "her" },
  he: { subject: "he", object: "him", possessive: "his" },
  they: { subject: "they", object: "them", possessive: "their" },
} as const;

export function pronounsFor(p: "she" | "he" | "they") {
  return PRONOUNS[p];
}

// Empty arrays get a type, so the inferred SiteConfig type keeps its shape.
export function heroLiteral(draft: ProfileDraft, indent: number) {
  const h = draft.hero;
  const body = tsLiteral(
    {
      badge: h.badge,
      headlineBefore: h.headlineBefore,
      headlineHighlight: h.headlineHighlight,
      headlineAfter: h.headlineAfter,
      paragraphs: h.paragraphs.length ? h.paragraphs : "__EMPTY_STRINGS__",
    },
    indent
  );
  return body.replace('"__EMPTY_STRINGS__"', "[] as string[]");
}

export function statsLiteral(draft: ProfileDraft, indent: number) {
  if (draft.stats.length === 0) return "[] as { value: string; description: string; href: string }[]";
  return tsLiteral(
    draft.stats.map((s) => ({ value: s.value, description: s.description, href: "" })),
    indent
  );
}

export function journeyLiteral(draft: ProfileDraft, indent: number) {
  const steps = draft.journey.steps.filter((s) => s.period || s.description);
  const body = tsLiteral({ heading: draft.journey.heading, steps: steps.length ? steps : "__EMPTY_STEPS__" }, indent);
  return body.replace('"__EMPTY_STEPS__"', "[] as { period: string; description: string }[]");
}

/** The person, contact, socials, seo, hero and home blocks, ready to paste into site.config.ts. */
export function configSnippet(draft: ProfileDraft, current: { photo: string; pronouns: "she" | "he" | "they" }) {
  const p = draft.person;
  const pronouns = pronounsFor(p.pronouns ?? current.pronouns);
  const lines = [
    "// Replace these blocks in site.config.ts (keep the rest of the file as it is),",
    "// then commit and redeploy.",
    `  person: ${tsLiteral(
      {
        name: p.name,
        initials: p.initials,
        firstName: p.firstName,
        pronouns,
        role: p.role,
        location: p.location,
        photo: current.photo,
        oneLiner: p.oneLiner,
      },
      2
    )},`,
    "",
    `  contact: ${tsLiteral({ email: draft.contact.email }, 2)},`,
    "",
    `  socials: ${tsLiteral(draft.socials, 2)},`,
    "",
    `  seo: ${tsLiteral({ ...draft.seo, index: true }, 2)},`,
    "",
    `  hero: ${heroLiteral(draft, 2)},`,
    "",
    "  home: {",
    `    stats: ${statsLiteral(draft, 4)},`,
    `    journey: ${journeyLiteral(draft, 4)},`,
    "  },",
  ];
  return lines.join("\n");
}
