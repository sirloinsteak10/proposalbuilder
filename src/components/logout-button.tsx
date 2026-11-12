"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";

export function LogoutButton() {
  const router = useRouter();
  const qc = useQueryClient();
  const logout = useMutation({
    mutationFn: async () => {
      await fetch("/api/auth/logout", { method: "POST" });
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
      Sign out
    </button>
  );
}
