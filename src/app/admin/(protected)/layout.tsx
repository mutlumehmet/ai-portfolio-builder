import Link from "next/link";

import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { siteConfig } from "@/lib/config";

import { logout } from "../actions";

// Admin pages always read fresh data and never prerender at build time.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col bg-background text-foreground">
      <div className="mx-auto w-full max-w-5xl px-6">
        <nav className="flex flex-col gap-4 border-b-2 border-border py-6 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/admin/projects" className="flex items-center gap-2 text-xl font-black">
            <Logo initials={siteConfig.person.initials} className="size-8" />
            {siteConfig.admin.label}
          </Link>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            <Link href="/admin/projects" className="text-sm font-bold hover:underline">
              Projects
            </Link>
            <Link href="/admin/tags" className="text-sm font-bold hover:underline">
              Tags
            </Link>
            <Link href="/admin/faqs" className="text-sm font-bold hover:underline">
              FAQ
            </Link>
            <Link href="/admin/experience" className="text-sm font-bold hover:underline">
              Experience
            </Link>
            <Link href="/" className="text-sm font-bold hover:underline">
              View site
            </Link>
            <form action={logout}>
              <Button type="submit" variant="neutral" size="sm">
                Log out
              </Button>
            </form>
          </div>
        </nav>
      </div>
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col px-6">
        <div className="flex-1 py-10">{children}</div>
      </div>
    </div>
  );
}
