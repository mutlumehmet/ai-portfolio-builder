import { ProjectsGrid } from "@/components/projects-grid";
import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { prisma } from "@/lib/prisma";

// Shared body of /projects and /side-projects. Both list every project; only
// the heading and which category leads differ.
export async function ProjectsListing({
  lead,
  heading,
}: {
  lead: "commercial" | "personal";
  heading: string;
}) {
  const [projects, tags] = await Promise.all([
    prisma.project.findMany({
      orderBy: [{ category: "asc" }, { order: "asc" }],
      include: { tags: true },
    }),
    prisma.tag.findMany({
      orderBy: [{ projects: { _count: "desc" } }, { name: "asc" }],
    }),
  ]);

  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <SiteHeader active={lead === "commercial" ? "work" : "side-projects"} />
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <section className="py-12">
          <h1 className="max-w-xl text-4xl font-black tracking-tight text-balance">
            {heading}
          </h1>
          <p className="mt-3 max-w-md text-muted-foreground">
            Filter by technology or industry.
          </p>
        </section>

        <section className="pb-24">
          <ProjectsGrid projects={projects} tags={tags} lead={lead} />
        </section>
      </div>
      <SiteFooter />
    </div>
  );
}
