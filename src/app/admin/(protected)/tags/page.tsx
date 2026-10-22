import { prisma } from "@/lib/prisma";

import { TagForm } from "./tag-form";
import { TagList } from "./tag-list";

export default async function AdminTagsPage() {
  const tags = await prisma.tag.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, kind: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-black">Tags</h1>
        <p className="mt-1 text-muted-foreground">
          Technology and industry tags available when creating or editing a
          project.
        </p>
      </div>

      <div className="mb-8">
        <TagForm />
      </div>

      <TagList tags={tags} />
    </div>
  );
}
