import { notFound } from "next/navigation";

import { ProjectForm } from "@/components/admin/project-form";
import { prisma } from "@/lib/prisma";

import { updateProject } from "../../actions";

export default async function EditProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [project, allTags] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { tags: true, blocks: { orderBy: { order: "asc" } } },
    }),
    prisma.tag.findMany({ orderBy: { name: "asc" } }),
  ]);

  if (!project) notFound();

  const boundUpdate = updateProject.bind(null, project.id);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">Edit project</h1>
      <ProjectForm action={boundUpdate} allTags={allTags} project={project} />
    </div>
  );
}
