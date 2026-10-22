import Link from "next/link";

import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";

import { ExperienceList } from "./experience-list";

export default async function AdminExperiencePage() {
  const experiences = await prisma.experience.findMany({
    orderBy: [{ order: "asc" }, { id: "asc" }],
    select: { id: true, title: true, company: true, startDate: true, endDate: true },
  });

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-black">Experience</h1>
        <Button asChild>
          <Link href="/admin/experience/new">+ New role</Link>
        </Button>
      </div>
      <ExperienceList experiences={experiences} />
    </div>
  );
}
