// A readable overview of a draft, for the owner to review before anything is written.
import { savableProjects, toExperienceJson, toFaqsJson, type ProfileDraft } from "./schema";

const or = (v: string) => v || "(empty)";

export function formatDraftSummary(draft: ProfileDraft, dropped: string[] = []) {
  const { person, hero } = draft;
  const out: string[] = [];
  out.push("PROFILE");
  out.push(`  Name:      ${or(person.name)} (first name ${or(person.firstName)}, initials ${or(person.initials)})`);
  out.push(`  Role:      ${or(person.role)}`);
  out.push(`  Location:  ${or(person.location)}`);
  out.push(`  Pronouns:  ${person.pronouns ?? "(not stated, you choose)"}`);
  out.push(`  One line:  ${or(person.oneLiner)}`);
  out.push(`  Email:     ${or(draft.contact.email)}`);
  out.push(`  LinkedIn:  ${or(draft.socials.linkedin)}`);
  out.push(`  GitHub:    ${or(draft.socials.github)}`);
  if (draft.socials.x) out.push(`  X:         ${draft.socials.x}`);

  out.push("", "HOME PAGE");
  out.push(`  Badge:     ${or(hero.badge)}`);
  out.push(`  Headline:  ${or([hero.headlineBefore, hero.headlineHighlight && `[${hero.headlineHighlight}]`, hero.headlineAfter].filter(Boolean).join(" "))}`);
  hero.paragraphs.forEach((p) => out.push(`  - ${p}`));
  out.push(`  Stats:     ${draft.stats.length || "none (no real numbers in the sources)"}`);
  draft.stats.forEach((s) => out.push(`  - ${s.value}: ${s.description}`));
  out.push(`  Journey:   ${or(draft.journey.heading)}`);
  draft.journey.steps.forEach((s) => out.push(`  - ${s.period}: ${s.description}`));

  out.push("", "SEO");
  out.push(`  Title:       ${or(draft.seo.title)}`);
  out.push(`  Description: ${or(draft.seo.description)}`);
  out.push(`  Tagline:     ${or(draft.seo.tagline)}`);

  const roles = toExperienceJson(draft.experience);
  const skipped = draft.experience.length - roles.length;
  out.push("", `EXPERIENCE (${roles.length})`);
  roles.forEach((r) => out.push(`  - ${r.title}, ${r.company}, ${r.startDate.slice(0, 7)} to ${r.endDate ? r.endDate.slice(0, 7) : "now"}`));
  if (skipped > 0) out.push(`  (${skipped} role(s) without a title, company or start date will be left out)`);

  const faqs = toFaqsJson(draft.faqs);
  out.push("", `FAQS (${faqs.length})`);
  faqs.forEach((f) => out.push(`  - ${f.question}`));

  const projects = savableProjects(draft.projects);
  out.push("", `PROJECTS (${projects.length})`);
  projects.forEach((p) => {
    out.push(`  - ${p.title} (/${p.slug}, ${p.category}${p.years.length ? `, ${p.years.join(", ")}` : ""})`);
    out.push(`    ${p.summary}`);
    const links = [p.repoUrl, p.liveUrl].filter(Boolean).join("  ");
    if (links) out.push(`    ${links}`);
  });

  if (dropped.length) {
    out.push("", "LEFT OUT (not found in your sources)");
    dropped.forEach((d) => out.push(`  - ${d}`));
  }
  return out.join("\n");
}
