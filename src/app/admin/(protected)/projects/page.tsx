import Link from "next/link";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

import { ProjectList } from "./project-list";

export default async function AdminProjectsPage() {
  const projects = await prisma.project.findMany({
    orderBy: [{ category: "asc" }, { order: "asc" }, { id: "asc" }],
    select: {
      id: true,
      title: true,
      slug: true,
      featured: true,
      year: true,
      yearRange: true,
      years: true,
      category: true,
      liveUrl: true,
    },
  });

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-black">Projects</h1>
        <Button asChild>
          <Link href="/admin/projects/new">+ New project</Link>
        </Button>
      </div>
      <ProjectList projects={projects} />
    </div>
  );
}
