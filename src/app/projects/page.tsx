import { ProjectsListing } from "@/components/projects-listing";

// Rendered per request, so `next build` never needs a database and content
// written by the scripts or the admin shows up straight away.
export const dynamic = "force-dynamic";

export default function ProjectsPage() {
  return <ProjectsListing lead="commercial" heading="Selected work" />;
}
