import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";
import { parseBlockData } from "@/lib/blocks";
import { siteConfig } from "@/lib/config";

function periodLabel(startDate: Date, endDate: Date | null) {
  const fmt = (d: Date) =>
    `${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  return `${fmt(startDate)} to ${endDate ? fmt(endDate) : "now"}`;
}

// Rendered per request, so `next build` never needs a database and content
// written by the scripts or the admin shows up straight away.
export const dynamic = "force-dynamic";

export default async function ExperiencePage() {
  const experience = await prisma.experience.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    include: { blocks: { orderBy: { order: "asc" } } },
  });

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <SiteHeader active="experience" />
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6">
        <section className="py-12">
          <h1 className="text-4xl font-black tracking-tight text-balance md:text-5xl">
            Experience
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            {siteConfig.experience.intro}
          </p>
        </section>

        <section className="relative pb-24">
          <div className="absolute top-2 bottom-2 left-[7px] w-0.5 bg-border" />
          <div className="flex flex-col gap-10">
            {experience.map((role) => {
              const highlights = role.blocks
                .filter((b) => b.type === "paragraph")
                .map((b) => parseBlockData("paragraph", b.data).text);

              return (
                <div key={role.id} className="relative pl-10">
                  <span className="absolute top-1 left-0 size-4 rounded-full border-2 border-border bg-primary" />
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <h2 className="text-xl font-black">{role.title}</h2>
                    <span className="text-muted-foreground">
                      at {role.company}
                    </span>
                  </div>
                  <div className="mt-1 mb-3 font-mono text-sm font-bold text-muted-foreground">
                    {periodLabel(role.startDate, role.endDate)}
                    {role.location ? ` · ${role.location}` : ""}
                  </div>
                  {highlights.length > 0 && (
                    <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                      {highlights.map((h) => (
                        <li key={h}>{h}</li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
