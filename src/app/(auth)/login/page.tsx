import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LoginForm } from "./login-form";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/proposals");
  return (
    <main className="flex min-h-dvh items-center justify-center bg-deep px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-xl">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/logo-teal.png" alt="Oshom Bali" className="mb-6 h-12 w-auto" />
        <h1 className="text-xl font-semibold text-ink">Proposal Builder</h1>
        <p className="mt-1 mb-6 text-sm text-muted">Sign in to create and manage event proposals.</p>
        <LoginForm />
      </div>
    </main>
  );
}
