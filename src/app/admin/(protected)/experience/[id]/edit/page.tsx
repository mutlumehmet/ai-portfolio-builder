import { notFound } from "next/navigation";

import { ExperienceForm } from "@/components/admin/experience-form";
import { prisma } from "@/lib/prisma";

import { updateExperience } from "../../actions";

export default async function EditExperiencePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const experience = await prisma.experience.findUnique({
    where: { id },
    include: { blocks: { orderBy: { order: "asc" } } },
  });

  if (!experience) notFound();

  const boundUpdate = updateExperience.bind(null, experience.id);

  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">Edit role</h1>
      <ExperienceForm action={boundUpdate} experience={experience} />
    </div>
  );
}
