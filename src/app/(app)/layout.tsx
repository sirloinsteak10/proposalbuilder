import Link from "next/link";
import { getCurrentUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-deep px-4 py-10">
        <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-teal.png" alt="Oshom Bali" className="mx-auto mb-6 h-12 w-auto" />
          <h1 className="text-xl font-semibold text-ink">Proposal Builder</h1>
          <p className="mt-3 text-sm text-muted">
            Open this app while signed in to Cursor. Private and team apps use Cursor sign-in — there is no email/password form.
          </p>
          <p className="mt-4 text-xs text-muted">Local previews use a simulated viewer automatically.</p>
        </div>
      </main>
    );
  }
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 flex-none items-center justify-between border-b-4 border-deep bg-white px-4 sm:px-6">
        <Link href="/proposals" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-teal.png" alt="Oshom Bali" className="h-8 w-auto" />
          <span className="hidden text-sm font-medium tracking-wide text-muted sm:inline">Proposal Builder</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="text-muted">{user.name}</span>
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
