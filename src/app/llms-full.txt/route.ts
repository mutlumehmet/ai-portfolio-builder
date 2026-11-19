import { blocksToMarkdown, roleDates } from "@/lib/agent-text";
import { features, siteConfig, siteUrl } from "@/lib/config";
import { prisma } from "@/lib/prisma";

// /llms-full.txt: everything on the site in one Markdown file, so an AI agent
// can read it all in one request (the short map is /llms.txt). Read per
// request, so `next build` never needs a database.
export const dynamic = "force-dynamic";

export async function GET() {
  const { person, seo, contact, socials, about, home } = siteConfig;
  const [projects, roles, faqs] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
      include: { tags: true, blocks: true },
    }),
    prisma.experience.findMany({ orderBy: [{ order: "asc" }, { id: "asc" }], include: { blocks: true } }),
    prisma.faq.findMany({ orderBy: { order: "asc" } }),
  ]);

  const sections = [
    `# ${person.name}`,
    `> ${seo.description}`,
    `${person.role}, based in ${person.location}. Website: ${siteUrl}. How AI agents should use this file: ${siteUrl}/agents.md`,

    "## About",
    [about.intro, ...about.paragraphs].join("\n\n"),

    "## How I work",
    home.traits.map((t) => `- **${t.title}**: ${t.description} (Proof: ${siteUrl}${t.proofHref})`).join("\n"),

    "## Systems I have designed",
    home.systems.map((s) => `- **${s.title}**: ${s.description} (Proof: ${siteUrl}${s.proofHref})`).join("\n"),

    "## Certificates and education",
    home.credentials.map((c) => `- ${c.year ? `${c.year}: ` : ""}${c.title}, ${c.issuer}`).join("\n"),

    "## Experience",
    roles
      .map((r) =>
        [
          `### ${r.title}, ${r.company}`,
          `${roleDates(r.startDate, r.endDate)}${r.location ? ` · ${r.location}` : ""}`,
          blocksToMarkdown(r.blocks, 2),
        ]
          .filter(Boolean)
          .join("\n\n"),
      )
      .join("\n\n"),

    "## Projects",
    projects
      .map((p) => {
        const years = p.years.length ? p.years.join(", ") : p.yearRange || p.year || "";
        return [
          `### ${p.title}`,
          `${siteUrl}/projects/${p.slug}`,
          [p.role, years, p.category === "personal" ? "Side project" : null].filter(Boolean).join(" · "),
          p.summary,
          p.tags.length ? `Tags: ${p.tags.map((t) => t.name).join(", ")}` : "",
          blocksToMarkdown(p.blocks, 2),
        ]
          .filter(Boolean)
          .join("\n\n");
      })
      .join("\n\n"),

    "## Stack",
    home.stackOrder.join(", "),

    "## FAQ",
    faqs.map((f) => `### ${f.question}\n\n${f.answer}`).join("\n\n"),

    "## Contact",
    [
      contact.email && `- Email: ${contact.email}`,
      socials.linkedin && `- LinkedIn: ${socials.linkedin}`,
      socials.github && `- GitHub: ${socials.github}`,
      features.cv && `- CV (PDF): ${siteUrl}/cv.pdf`,
    ]
      .filter(Boolean)
      .join("\n"),
  ];

  // A heading followed by an empty body (an empty list in site.config.ts) is left out.
  const text = sections
    .filter((s, i) => !(s.startsWith("## ") && !sections[i + 1]) && !(!s && sections[i - 1]?.startsWith("## ")))
    .join("\n\n");
  return new Response(text + "\n", {
    headers: { "content-type": "text/markdown; charset=utf-8" },
  });
}
