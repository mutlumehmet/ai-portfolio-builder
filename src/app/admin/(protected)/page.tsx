import { redirect } from "next/navigation";

// /admin has no page of its own: open the projects list. Without this, logging
// in from /admin (where the proxy sends visitors without a session) ends on a 404.
export default function AdminIndexPage() {
  redirect("/admin/projects");
}
