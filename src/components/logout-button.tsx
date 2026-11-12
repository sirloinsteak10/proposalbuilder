"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function LogoutButton() {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/logout", { method: "POST", credentials: "same-origin" });
      if (!res.ok) throw new Error("Could not sign out");
    },
    onSuccess: () => {
      qc.clear();
      router.replace("/login");
      router.refresh();
    },
  });
  return (
    <button
      type="button"
      onClick={() => logout.mutate()}
      disabled={logout.isPending}
      className="rounded-md border border-hair px-3 py-1.5 text-xs font-medium text-ink transition hover:border-teal disabled:opacity-60"
    >
      {logout.isPending ? "Signing out…" : "Sign out"}
    </button>
  );
}
