"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/client/api";
import { longDate } from "@/lib/format";
import type { ProposalDto, ProposalListItem } from "@/lib/proposals";

const STATUS_LABEL: Record<ProposalListItem["status"], string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  CONFIRMED: "Confirmed",
  ARCHIVED: "Archived",
};
const STATUS_STYLE: Record<ProposalListItem["status"], string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  SENT: "bg-sky/15 text-sky-900",
  CONFIRMED: "bg-teal/15 text-teal-dark",
  ARCHIVED: "bg-stone-100 text-stone-500",
};

export function ProposalList() {
  const router = useRouter();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");

  const list = useQuery({
    queryKey: ["proposals", { q, status }],
    queryFn: () => {
      const p = new URLSearchParams();
      if (q.trim()) p.set("q", q.trim());
      if (status) p.set("status", status);
      return api<{ items: ProposalListItem[] }>(`/api/proposals?${p}`);
    },
  });

  const create = useMutation({
    mutationFn: () => api<ProposalDto>("/api/proposals", { method: "POST" }),
    onSuccess: (p) => router.push(`/proposals/${p.id}`),
  });

  const importFile = useMutation({
    mutationFn: async (file: File) => {
      if (file.size > 512 * 1024) throw new Error("File is too large (max 512 KB)");
      const text = await file.text();
      let json: unknown;
      try {
        json = JSON.parse(text);
      } catch {
        throw new Error("This file is not valid JSON");
      }
      return api<ProposalDto>("/api/proposals/import", { method: "POST", body: JSON.stringify(json) });
    },
    onSuccess: (p) => router.push(`/proposals/${p.id}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => api(`/api/proposals/${id}`, { method: "DELETE" }),
    // Optimistically drop the row, restore it if the server refuses.
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["proposals"] });
      const snapshots = qc.getQueriesData<{ items: ProposalListItem[] }>({ queryKey: ["proposals"] });
      snapshots.forEach(([key, value]) => {
        if (value) qc.setQueryData(key, { items: value.items.filter((i) => i.id !== id) });
      });
      return { snapshots };
    },
    onError: (_e, _id, ctx) => ctx?.snapshots.forEach(([key, value]) => qc.setQueryData(key, value)),
    onSettled: () => qc.invalidateQueries({ queryKey: ["proposals"] }),
  });

  const items = list.data?.items ?? [];
  const error = (create.error ?? importFile.error ?? remove.error) as Error | null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Proposals</h1>
          <p className="text-sm text-muted">Create an event proposal, edit it with a live preview, then download the PDF.</p>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".json,application/json"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) importFile.mutate(f);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importFile.isPending}
            className="h-10 rounded-lg border border-hair bg-white px-4 text-sm font-medium text-ink transition hover:border-teal disabled:opacity-60"
          >
            {importFile.isPending ? "Importing…" : "Import file"}
          </button>
          <button
            type="button"
            onClick={() => create.mutate()}
            disabled={create.isPending}
            className="h-10 rounded-lg bg-teal px-4 text-sm font-semibold text-white transition hover:bg-teal-dark disabled:opacity-60"
          >
            {create.isPending ? "Creating…" : "New proposal"}
          </button>
        </div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <label className="sr-only" htmlFor="search">
          Search proposals
        </label>
        <input
          id="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search by guest, company or event"
          className="h-10 min-w-0 flex-1 rounded-lg border border-hair bg-white px-3 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20 sm:max-w-sm"
        />
        <label className="sr-only" htmlFor="status">
          Filter by status
        </label>
        <select
          id="status"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-10 rounded-lg border border-hair bg-white px-3 text-sm outline-none focus:border-teal"
        >
          <option value="">All statuses</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>

      {error ? (
        <p role="alert" className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">
          {error.message}
        </p>
      ) : null}

      <div className="mt-4 overflow-hidden rounded-xl border border-hair bg-white">
        {list.isPending ? (
          <p className="p-6 text-sm text-muted">Loading proposals…</p>
        ) : list.isError ? (
          <p className="p-6 text-sm text-red-800">Could not load proposals. Refresh to try again.</p>
        ) : items.length === 0 ? (
          <div className="p-10 text-center">
            <p className="font-medium text-ink">No proposals yet</p>
            <p className="mt-1 text-sm text-muted">Start a new proposal or import a saved .proposal.json file.</p>
          </div>
        ) : (
          <ul className="divide-y divide-hair">
            {items.map((p) => (
              <li key={p.id} className="flex items-center gap-3 px-4 py-3 hover:bg-paper">
                <Link href={`/proposals/${p.id}`} className="min-w-0 flex-1">
                  <div className="truncate font-medium text-ink">{p.title}</div>
                  <div className="mt-0.5 truncate text-xs text-muted">
                    {longDate(p.eventDate, "en") || "Date TBC"} · Updated {new Date(p.updatedAt).toLocaleString("en-GB")} ·{" "}
                    {p.ownerName}
                  </div>
                </Link>
                <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[p.status]}`}>{STATUS_LABEL[p.status]}</span>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(`Delete "${p.title}"? This cannot be undone.`)) remove.mutate(p.id);
                  }}
                  className="rounded-md px-2 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
                  aria-label={`Delete ${p.title}`}
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
