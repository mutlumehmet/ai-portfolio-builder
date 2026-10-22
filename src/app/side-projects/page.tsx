import { ProjectsListing } from "@/components/projects-listing";

// Same reason as /projects.
export const dynamic = "force-dynamic";

export default function SideProjectsPage() {
  return <ProjectsListing lead="personal" heading="Side projects" />;
}
