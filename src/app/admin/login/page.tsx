import { LoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string }>;
}) {
  const { from } = await searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-background px-6">
      <div className="w-full max-w-sm rounded-lg border-2 border-border bg-card p-8 shadow-brutal">
        <h1 className="mb-1 text-2xl font-black">Admin</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Sign in to manage projects.
        </p>
        <LoginForm from={from ?? "/admin/projects"} />
      </div>
    </div>
  );
}
