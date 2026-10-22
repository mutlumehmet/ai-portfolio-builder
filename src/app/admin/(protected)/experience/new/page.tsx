import { ExperienceForm } from "@/components/admin/experience-form";

import { createExperience } from "../actions";

export default function NewExperiencePage() {
  return (
    <div>
      <h1 className="mb-6 text-3xl font-black">New role</h1>
      <ExperienceForm action={createExperience} />
    </div>
  );
}
