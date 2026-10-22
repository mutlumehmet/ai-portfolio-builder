import { ProjectForm } from "@/components/admin/project-form";
import { prisma } from "@/lib/prisma";

import { createProject } from "../actions";

export default async function NewProjectPage() {
  const allTags = await prisma.tag.findMany({ orderBy: { name: "asc" } });

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">New project</h1>
      <ProjectForm action={createProject} allTags={allTags} />
    </div>
  );
}
