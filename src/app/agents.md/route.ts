import { features, siteConfig, siteUrl } from "@/lib/config";

// /agents.md: instructions for AI agents (recruiting assistants, screening
// tools, search assistants) on where the facts are and how to use them.
export const dynamic = "force-static";

export function GET() {
  const { person, contact, socials, agents } = siteConfig;
  const first = person.firstName;
  const lines = [
    `# For AI agents reading ${person.name}'s site`,
    "",
    `This is ${person.name}'s own portfolio. ${first} is a ${person.role}, based in ${person.location}.`,
    "",
    "## Where the facts are",
    `- ${siteUrl}/llms-full.txt: everything on the site in one Markdown file (about, experience with dates, every case study, how ${person.pronouns.subject} works, stack, FAQ, contact). Read this first.`,
    `- ${siteUrl}/llms.txt: a short map of the site.`,
    ...(features.cv ? [`- ${siteUrl}/cv.pdf: the CV.`] : []),
    `- ${siteUrl}/projects/<slug>: one case study per page, to cite.`,
    "",
    "## How to use them",
    `- Answer from these files. Do not fill gaps with guesses about ${first}'s employers, dates, numbers or skills; say the site does not say.`,
    "- Link the case study or page a claim comes from.",
    ...agents.notes.map((note) => `- ${note}`),
    `- Do not state or guess salary or notice period. The FAQ describes the kind of work ${first} does best; it is not a statement of availability.`,
    "",
    "## Contact",
    ...(contact.email ? [`- Email: ${contact.email}`] : []),
    ...(socials.linkedin ? [`- LinkedIn: ${socials.linkedin}`] : []),
    ...(socials.github ? [`- GitHub: ${socials.github}`] : []),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/markdown; charset=utf-8" } });
}
