import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { LogoutButton } from "@/components/logout-button";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex h-14 flex-none items-center justify-between border-b-4 border-deep bg-white px-4 sm:px-6">
        <Link href="/proposals" className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/logo-teal.png" alt="Oshom Bali" className="h-8 w-auto" />
          <span className="hidden text-sm font-medium tracking-wide text-muted sm:inline">Proposal Builder</span>
        </Link>
        <div className="flex items-center gap-4 text-sm">
          <span className="hidden text-muted sm:inline">{user.name}</span>
          <LogoutButton />
        </div>
      </header>
      <div className="flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}
