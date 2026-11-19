import { features, siteConfig, siteUrl } from "@/lib/config";
import { prisma } from "@/lib/prisma";

// /llms.txt: a plain-text map of the site for AI tools (https://llmstxt.org).
// Read per request, so `next build` never needs a database.
export const dynamic = "force-dynamic";

const year = (d: Date | null) => (d ? String(d.getUTCFullYear()) : "now");

export async function GET() {
  const { person, seo, contact, socials } = siteConfig;
  const [projects, roles] = await Promise.all([
    prisma.project.findMany({ orderBy: [{ category: "asc" }, { order: "asc" }], select: { slug: true, title: true, summary: true } }),
    prisma.experience.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }], select: { title: true, company: true, startDate: true, endDate: true } }),
  ]);

  const lines = [
    `# ${person.name}`,
    "",
    `> ${seo.description}`,
    "",
    `${person.role}, based in ${person.location}.`,
    "",
    "## Pages",
    `- [About me](${siteUrl}/about)`,
    `- [Work](${siteUrl}/projects): case studies, each with what I did and how`,
    ...(siteConfig.home.traits.length > 0
      ? [`- [How I work](${siteUrl}/how-i-work): working habits, each with a project as proof`]
      : []),
    `- [Experience](${siteUrl}/experience): every role, with dates`,
    ...(features.cv ? [`- [CV (PDF)](${siteUrl}/cv.pdf)`] : []),
    "",
    "## For AI agents",
    `- [Everything in one file](${siteUrl}/llms-full.txt): every page's content as Markdown`,
    `- [How to use this site](${siteUrl}/agents.md): where the facts are and how to cite them`,
    "",
    "## Projects",
    ...projects.map((p) => `- [${p.title}](${siteUrl}/projects/${p.slug}): ${p.summary}`),
    "",
    "## Experience",
    ...roles.map((r) => `- ${r.title}, ${r.company} (${year(r.startDate)} to ${year(r.endDate)})`),
    "",
    "## Contact",
    ...(contact.email ? [`- Email: ${contact.email}`] : []),
    ...(socials.linkedin ? [`- LinkedIn: ${socials.linkedin}`] : []),
    ...(socials.github ? [`- GitHub: ${socials.github}`] : []),
    "",
  ];
  return new Response(lines.join("\n"), { headers: { "content-type": "text/plain; charset=utf-8" } });
}
