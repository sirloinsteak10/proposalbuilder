"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FormProvider, useForm, useFormContext, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, HttpError } from "@/lib/client/api";
import { computeSummary, formatIdr } from "@/lib/pricing";
import { proposalDataSchema, type ProposalData, type ProposalInput } from "@/lib/schemas/proposal";
import type { ProposalDto, Status } from "@/lib/proposals";
import type { VenueDto } from "@/lib/venues";
import { ProposalDocument } from "@/components/document/ProposalDocument";
import {
  buyoutAsItem,
  ENTERTAINMENT_OPTIONS,
  entertainmentAsItem,
  FULL_VENUE_BUYOUT_NET,
  WEDDING_PACKAGES,
  weddingPackageAsItem,
} from "@/lib/catalogs";
import { inputClass, NumberField, Section, TextAreaField, TextField, Toggle, Field, labelClass } from "./fields";
import { LineItems } from "./line-items";

type SaveState = "saved" | "saving" | "dirty" | "error" | "conflict";

const STATUS_OPTIONS: { value: Status; label: string }[] = [
  { value: "DRAFT", label: "Draft" },
  { value: "SENT", label: "Sent" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "ARCHIVED", label: "Archived" },
];

const PAGE_PX = 793.7; // 210mm at 96dpi

export function ProposalEditor({ initial, venues }: { initial: ProposalDto; venues: VenueDto[] }) {
  const qc = useQueryClient();
  const id = initial.id;

  // The query cache holds the latest server copy; the form owns the in-progress edits.
  const { data: proposal } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => api<ProposalDto>(`/api/proposals/${id}`),
    initialData: initial,
    staleTime: Infinity,
  });

  const form = useForm<ProposalInput, unknown, ProposalData>({
    resolver: zodResolver(proposalDataSchema),
    defaultValues: initial.data,
    mode: "onChange",
  });

  const watched = useWatch({ control: form.control });
  const parsed = useMemo(() => proposalDataSchema.safeParse(watched), [watched]);
  // While a field is briefly invalid (for example half-typed), keep rendering the last valid data.
  const [data, setData] = useState<ProposalData>(initial.data);
  if (parsed.success && parsed.data !== data) setData(parsed.data);
  const latest = useRef<ProposalData>(initial.data);
  useEffect(() => {
    latest.current = data;
  }, [data]);
  const summary = useMemo(() => computeSummary(data), [data]);

  /* ------------------------------ saving ------------------------------ */
  const versionRef = useRef(initial.version);
  const lastSavedJson = useRef(JSON.stringify(proposalDataSchema.parse(initial.data)));
  const chain = useRef<Promise<unknown>>(Promise.resolve());
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [status, setStatus] = useState<Status>(initial.status);
  const conflict = useRef(false);

  const patch = useMutation({
    mutationFn: (vars: { data?: ProposalData; status?: Status }) => {
      const run = () =>
        api<ProposalDto>(`/api/proposals/${id}`, {
          method: "PATCH",
          body: JSON.stringify({ version: versionRef.current, ...vars }),
        });
      const p = chain.current.then(run, run);
      chain.current = p.catch(() => undefined);
      return p;
    },
    // Optimistically update the cached proposal so other views (and a reload within the session) see the edit at once.
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: ["proposal", id] });
      const prev = qc.getQueryData<ProposalDto>(["proposal", id]);
      if (prev) qc.setQueryData<ProposalDto>(["proposal", id], { ...prev, ...(vars.data ? { data: vars.data } : {}), ...(vars.status ? { status: vars.status } : {}) });
      return { prev };
    },
    onSuccess: (dto, vars) => {
      versionRef.current = dto.version;
      if (vars.data) lastSavedJson.current = JSON.stringify(vars.data);
      qc.setQueryData(["proposal", id], dto);
      void qc.invalidateQueries({ queryKey: ["proposals"] });
    },
    onError: (e, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(["proposal", id], ctx.prev);
      if (e instanceof HttpError && e.status === 409) {
        conflict.current = true;
        setSaveState("conflict");
      } else {
        setSaveState("error");
      }
    },
  });

  const flush = useCallback(async () => {
    if (conflict.current) return;
    const toSave = latest.current;
    const json = JSON.stringify(toSave);
    if (json === lastSavedJson.current) {
      setSaveState((s) => (s === "dirty" || s === "saving" ? "saved" : s));
      return;
    }
    setSaveState("saving");
    try {
      await patch.mutateAsync({ data: toSave });
      setSaveState(JSON.stringify(latest.current) === lastSavedJson.current ? "saved" : "dirty");
    } catch {
      /* state set in onError */
    }
  }, [patch]);

  const dataJson = parsed.success ? JSON.stringify(parsed.data) : null;
  useEffect(() => {
    if (!dataJson || conflict.current) return;
    if (dataJson === lastSavedJson.current) return;
    setSaveState((s) => (s === "saving" ? s : "dirty"));
    const timer = setTimeout(() => void flush(), 900);
    return () => clearTimeout(timer);
  }, [dataJson, flush]);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (saveState === "dirty" || saveState === "saving" || saveState === "error") e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [saveState]);

  /* ------------------------------ actions ------------------------------ */
  const [pdfBusy, setPdfBusy] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  async function downloadPdf() {
    setPdfBusy(true);
    setPdfError(null);
    try {
      await flush();
      const res = await fetch(`/api/proposals/${id}/pdf`);
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `PDF export failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${proposal.title || "Proposal"}.pdf`;
      document.body.append(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setPdfError(e instanceof Error ? e.message : "PDF export failed");
    } finally {
      setPdfBusy(false);
    }
  }

  async function exportFile() {
    await flush();
    const a = document.createElement("a");
    a.href = `/api/proposals/${id}/export`;
    a.download = "";
    document.body.append(a);
    a.click();
    a.remove();
  }

  function changeStatus(next: Status) {
    const prev = status;
    setStatus(next);
    patch.mutate({ status: next }, { onError: () => setStatus(prev) });
  }

  const onEdit = useCallback(
    (key: string, value: string, fallback: string) => {
      const current = { ...(form.getValues("edits") ?? {}) };
      const clean = value.replace(/\u00a0/g, " ").trim();
      if (!clean || clean === fallback) delete current[key];
      else current[key] = clean;
      form.setValue("edits", current, { shouldDirty: true });
    },
    [form],
  );

  const venue = venues.find((v) => v.key === data.venueKey) ?? null;

  return (
    <FormProvider {...form}>
      <div className="flex min-h-0 flex-1 flex-col lg:h-[calc(100dvh-3.5rem)] lg:flex-row">
        {/* ------------------------- form column ------------------------- */}
        <div className="flex w-full flex-none flex-col border-r border-hair bg-white lg:w-[27rem]">
          <div className="flex flex-none flex-wrap items-center gap-2 border-b border-hair px-4 py-3">
            <Link href="/proposals" className="text-sm font-medium text-teal hover:underline">
              ← Proposals
            </Link>
            <span className="ml-auto" aria-live="polite">
              <SaveBadge state={saveState} onRetry={() => void flush()} />
            </span>
          </div>

          <div className="flex-none space-y-3 border-b border-hair px-4 py-3">
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-ink">{proposal.title}</div>
                <div className="text-xs text-muted">
                  Total {formatIdr(summary.total)}
                  {summary.perPerson ? ` · ${formatIdr(summary.perPerson)} per person` : ""}
                </div>
              </div>
              <div role="group" aria-label="Proposal language" className="flex overflow-hidden rounded-lg border border-hair text-xs font-semibold">
                {(["en", "id"] as const).map((l) => (
                  <button
                    key={l}
                    type="button"
                    aria-pressed={data.lang === l}
                    onClick={() => form.setValue("lang", l, { shouldDirty: true })}
                    className={`px-3 py-2 uppercase ${data.lang === l ? "bg-teal text-white" : "bg-white text-muted hover:bg-paper"}`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-2">
              <label htmlFor="status" className="sr-only">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => changeStatus(e.target.value as Status)}
                className="h-10 rounded-lg border border-hair bg-white px-2 text-sm outline-none focus:border-teal"
              >
                {STATUS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={exportFile}
                className="h-10 rounded-lg border border-hair bg-white px-3 text-sm font-medium text-ink transition hover:border-teal"
                title="Download as .proposal.json"
              >
                Save file
              </button>
              <button
                type="button"
                onClick={downloadPdf}
                disabled={pdfBusy || saveState === "conflict"}
                className="h-10 flex-1 rounded-lg bg-teal px-3 text-sm font-semibold text-white transition hover:bg-teal-dark disabled:opacity-60"
              >
                {pdfBusy ? "Preparing PDF…" : "Download PDF"}
              </button>
            </div>
            {pdfError ? (
              <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-800">
                {pdfError}
              </p>
            ) : null}
            {saveState === "conflict" ? (
              <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                This proposal was changed elsewhere, so autosave is paused.{" "}
                <button type="button" className="font-semibold underline" onClick={() => window.location.reload()}>
                  Reload
                </button>{" "}
                to get the latest version.
              </p>
            ) : null}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <FormSections venues={venues} />
          </div>
        </div>

        {/* ------------------------ preview column ------------------------ */}
        <PreviewPane>
          <ProposalDocument data={data} venue={venue} editable onEdit={onEdit} />
        </PreviewPane>
      </div>
    </FormProvider>
  );
}

function SaveBadge({ state, onRetry }: { state: SaveState; onRetry: () => void }) {
  const map: Record<SaveState, { text: string; cls: string }> = {
    saved: { text: "All changes saved", cls: "text-teal" },
    saving: { text: "Saving…", cls: "text-muted" },
    dirty: { text: "Unsaved changes", cls: "text-muted" },
    error: { text: "Could not save", cls: "text-red-700" },
    conflict: { text: "Autosave paused", cls: "text-amber-800" },
  };
  const m = map[state];
  return (
    <span className={`text-xs font-medium ${m.cls}`}>
      {m.text}
      {state === "error" ? (
        <button type="button" onClick={onRetry} className="ml-2 underline">
          Retry
        </button>
      ) : null}
    </span>
  );
}

function PreviewPane({ children }: { children: React.ReactNode }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.8);
  const [height, setHeight] = useState(0);
  const [zoom, setZoom] = useState<"fit" | number>("fit");

  useEffect(() => {
    const wrap = wrapRef.current;
    const inner = innerRef.current;
    if (!wrap || !inner) return;
    const update = () => {
      const fit = Math.min(1, Math.max(0.3, (wrap.clientWidth - 32) / PAGE_PX));
      const s = zoom === "fit" ? fit : zoom;
      setScale(s);
      setHeight(inner.offsetHeight * s);
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(wrap);
    ro.observe(inner);
    return () => ro.disconnect();
  }, [zoom]);

  return (
    <div className="relative flex min-h-[60vh] min-w-0 flex-1 flex-col bg-[#e5eded]">
      <div className="flex flex-none items-center justify-between gap-2 border-b border-hair bg-white/80 px-4 py-2 text-xs text-muted">
        <span>Live preview · click highlighted text to edit it directly</span>
        <div className="flex items-center gap-1">
          <button type="button" onClick={() => setZoom((z) => Math.max(0.3, (z === "fit" ? scale : z) - 0.1))} className="h-7 w-7 rounded border border-hair bg-white" aria-label="Zoom out">
            −
          </button>
          <button type="button" onClick={() => setZoom("fit")} className="h-7 rounded border border-hair bg-white px-2">
            {Math.round(scale * 100)}%
          </button>
          <button type="button" onClick={() => setZoom((z) => Math.min(1.5, (z === "fit" ? scale : z) + 0.1))} className="h-7 w-7 rounded border border-hair bg-white" aria-label="Zoom in">
            +
          </button>
        </div>
      </div>
      <div ref={wrapRef} className="min-h-0 flex-1 overflow-auto p-4">
        <div style={{ width: PAGE_PX * scale, height, margin: "0 auto" }}>
          <div
            ref={innerRef}
            className="preview-pages"
            style={{ width: PAGE_PX, transform: `scale(${scale})`, transformOrigin: "top left" }}
          >
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormSections({ venues }: { venues: VenueDto[] }) {
  const { register, setValue, control, formState, getValues } = useFormContext<ProposalInput>();
  const venueKey = useWatch({ control, name: "venueKey" });
  const rundown = useWatch({ control, name: "rundown" }) ?? [];
  const terms = useWatch({ control, name: "terms" }) ?? [];
  const errors = formState.errors;

  const setTerms = (next: string[]) => setValue("terms", next, { shouldDirty: true, shouldValidate: true });
  const setRundown = (next: NonNullable<ProposalInput["rundown"]>) => setValue("rundown", next, { shouldDirty: true, shouldValidate: true });
  const appendItems = (field: "items" | "ent" | "fb", rows: NonNullable<ProposalInput["items"]>) => {
    const current = (getValues(field) ?? []) as NonNullable<ProposalInput["items"]>;
    setValue(field, [...current, ...rows], { shouldDirty: true, shouldValidate: true });
  };

  return (
    <div>
      <Section title="Guest & contacts" defaultOpen>
        <TextField name="guestName" label="Guest name" />
        <TextField name="company" label="Company" />
        <TextField name="issueDate" label="Issue date" type="date" />
        <p className="pt-2 text-xs font-semibold text-ink">Oshom PIC 1</p>
        <TextField name="picName" label="Name" />
        <TextField name="picTitle" label="Title" />
        <TextField name="picEmail" label="Email" type="email" />
        <TextField name="picPhone" label="Phone" type="tel" />
        <p className="pt-2 text-xs font-semibold text-ink">Oshom PIC 2</p>
        <TextField name="pic2Name" label="Name" />
        <TextField name="pic2Title" label="Title" />
        <TextField name="pic2Email" label="Email" type="email" />
        <TextField name="pic2Phone" label="Phone" type="tel" />
      </Section>

      <Section title="Event details" defaultOpen>
        <TextField name="eventName" label="Event name" />
        <TextField name="eventDate" label="Event date" type="date" />
        <div className="grid grid-cols-2 gap-2">
          <TextField name="timeFrom" label="From" type="time" />
          <TextField name="timeTo" label="To" type="time" />
        </div>
        <TextField name="pax" label="Guest attendance (pax)" inputMode="numeric" hint="Used for per-guest prices and per-person totals." />
        {errors.pax ? <p className="text-xs text-red-700">Enter a valid number of guests.</p> : null}
      </Section>

      <Section title="Venue">
        <Field label="Venue" htmlFor="venueKey">
          <select id="venueKey" className={inputClass} {...register("venueKey")}>
            {venues.map((v) => (
              <option key={v.key} value={v.key}>
                {v.name}
              </option>
            ))}
            <option value="other">Other (type a name)</option>
          </select>
        </Field>
        {venueKey === "other" ? <TextField name="venueOther" label="Venue name" /> : null}
        <TextField name="rentalDesc" label="Rental description" placeholder="e.g. Venue rental, 4 hours" />
        <NumberField name="rentalPrice" label="Rental price (Rp)" />
        <Toggle name="rentalInSummary" label="Include rental in the cost summary" hint="Turn off if the rental is waived or quoted separately." />
        <p className="pt-2 text-xs font-semibold text-ink">Additional venues or areas</p>
        <LineItems name="extraVenues" addLabel="Add venue / area" />
      </Section>

      <Section title="Seats">
        <LineItems name="seats" addLabel="Add seat package" namePlaceholder="e.g. Daybed" />
        <div className="grid grid-cols-2 gap-2">
          <TextField name="seatDisc.label" label="Discount label" />
          <TextField name="seatDisc.pct" label="Discount %" inputMode="decimal" />
        </div>
        <Toggle name="seatCredit" label="Seat charge is redeemable as F&B credit" hint="Adds a note under the seats in the proposal." />
      </Section>

      <Section title="Oshom packages">
        <p className="text-xs text-muted">Insert wedding packages or a full venue buyout from Oshom Bali rate cards (net prices; 21% tax &amp; service applies unless tax mode says otherwise).</p>
        <div className="flex flex-col gap-2">
          {WEDDING_PACKAGES.map((pkg) => (
            <button
              key={pkg.key}
              type="button"
              onClick={() => {
                appendItems("items", [weddingPackageAsItem(pkg)]);
                setValue("pax", String(pkg.guests), { shouldDirty: true, shouldValidate: true });
                setValue("venueKey", "lawn", { shouldDirty: true });
                setValue("eventName", pkg.name, { shouldDirty: true });
              }}
              className="rounded-lg border border-hair bg-white px-3 py-2 text-left text-sm hover:border-teal hover:bg-teal/5"
            >
              <span className="font-semibold text-ink">{pkg.name}</span>
              <span className="mt-0.5 block text-xs text-muted">
                {pkg.guests} guests · {formatIdr(pkg.price)} net
              </span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              appendItems("items", [buyoutAsItem()]);
              setValue("venueKey", "full-buyout", { shouldDirty: true });
              setValue("eventName", "Full Venue Buyout", { shouldDirty: true });
            }}
            className="rounded-lg border border-hair bg-white px-3 py-2 text-left text-sm hover:border-teal hover:bg-teal/5"
          >
            <span className="font-semibold text-ink">Full Venue Buyout (1 day)</span>
            <span className="mt-0.5 block text-xs text-muted">{formatIdr(FULL_VENUE_BUYOUT_NET)} net</span>
          </button>
        </div>
      </Section>

      <Section title="Entertainment">
        <LineItems name="ent" addLabel="Add entertainment" namePlaceholder="e.g. Live DJ" />
        <Field label="Add from entertainment recommendations" htmlFor="ent-catalog">
          <select
            id="ent-catalog"
            className={inputClass}
            defaultValue=""
            onChange={(e) => {
              const opt = ENTERTAINMENT_OPTIONS[Number(e.target.value)];
              if (opt) appendItems("ent", [entertainmentAsItem(opt)]);
              e.target.value = "";
            }}
          >
            <option value="" disabled>
              Choose an entertainment option…
            </option>
            {ENTERTAINMENT_OPTIONS.map((opt, i) => (
              <option key={`${opt.category}-${opt.name}`} value={i}>
                {opt.category}: {opt.name} · {formatIdr(opt.price)}
              </option>
            ))}
          </select>
        </Field>
      </Section>

      <Section title="Food & beverage">
        <LineItems name="fb" addLabel="Add menu or package" namePlaceholder="e.g. Set dinner" />
        <TextAreaField name="fbNotes" label="Menu notes" rows={3} />
      </Section>

      <Section title="Extras">
        <LineItems name="extras" addLabel="Add extra" />
        <TextAreaField name="extrasCustom" label="Additional notes" rows={3} />
      </Section>

      <Section title="Other items">
        <LineItems name="items" addLabel="Add item" />
      </Section>

      <Section title="Rundown" summary={`${rundown.filter((r) => r.t || r.a).length} rows`}>
        {rundown.map((row, i) => (
          <div key={i} className="grid grid-cols-[6rem_1fr_auto] items-start gap-2">
            <div>
              <label htmlFor={`rd-t-${i}`} className={labelClass}>
                Time
              </label>
              <input id={`rd-t-${i}`} className={inputClass} placeholder="18:00" {...register(`rundown.${i}.t`)} />
            </div>
            <div>
              <label htmlFor={`rd-a-${i}`} className={labelClass}>
                Activity
              </label>
              <input id={`rd-a-${i}`} className={inputClass} {...register(`rundown.${i}.a`)} />
            </div>
            <button
              type="button"
              onClick={() => setRundown(rundown.filter((_, j) => j !== i).length ? rundown.filter((_, j) => j !== i) : [{ t: "", a: "" }])}
              className="mt-6 rounded-md px-2 py-2 text-xs font-medium text-red-700 hover:bg-red-50"
              aria-label={`Remove rundown row ${i + 1}`}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setRundown([...rundown, { t: "", a: "" }])}
          className="h-9 w-full rounded-lg border border-dashed border-teal/60 text-sm font-medium text-teal hover:bg-teal/5"
        >
          + Add row
        </button>
      </Section>

      <Section title="Payment terms">
        <TextField name="balanceDate" label="Balance due date" type="date" />
        <TextAreaField
          name="paymentTerms"
          label="Payment terms"
          rows={8}
          hint="Placeholders: {DEPOSIT} (50% of total), {BALANCE} and {BALANCE_DATE}."
        />
      </Section>

      <Section title="Terms & conditions" summary={`${terms.length} items`}>
        {terms.map((term, i) => (
          <div key={i} className="rounded-lg border border-hair bg-paper/60 p-2">
            <label htmlFor={`term-${i}`} className={labelClass}>
              Term {i + 1}
            </label>
            <textarea
              id={`term-${i}`}
              rows={3}
              className="w-full rounded-lg border border-hair bg-white px-3 py-2 text-sm outline-none focus:border-teal focus:ring-2 focus:ring-teal/20"
              {...register(`terms.${i}`)}
            />
            <div className="mt-1 flex justify-end gap-1 text-xs">
              <button
                type="button"
                disabled={i === 0}
                onClick={() => {
                  const n = [...terms];
                  [n[i - 1], n[i]] = [n[i], n[i - 1]];
                  setTerms(n);
                }}
                className="rounded px-2 py-1 hover:bg-white disabled:opacity-30"
                aria-label={`Move term ${i + 1} up`}
              >
                ↑
              </button>
              <button
                type="button"
                disabled={i === terms.length - 1}
                onClick={() => {
                  const n = [...terms];
                  [n[i + 1], n[i]] = [n[i], n[i + 1]];
                  setTerms(n);
                }}
                className="rounded px-2 py-1 hover:bg-white disabled:opacity-30"
                aria-label={`Move term ${i + 1} down`}
              >
                ↓
              </button>
              <button type="button" onClick={() => setTerms(terms.filter((_, j) => j !== i))} className="rounded px-2 py-1 font-medium text-red-700 hover:bg-red-50">
                Remove
              </button>
            </div>
          </div>
        ))}
        <button
          type="button"
          onClick={() => setTerms([...terms, ""])}
          className="h-9 w-full rounded-lg border border-dashed border-teal/60 text-sm font-medium text-teal hover:bg-teal/5"
        >
          + Add term
        </button>
      </Section>

      <Section title="Pages & tax">
        <Toggle name="opts.cover" label="Cover page" />
        <Toggle name="opts.venuePage" label="Venue page" />
        <Toggle name="opts.menuPage" label="Food & beverage menu page" />
        <Toggle name="opts.closing" label="Acceptance & signature page" />
        <Toggle name="opts.perPerson" label="Show price per person" />
        <Toggle name="opts.splitTax" label="Split tax into its two components" hint="10% government tax (PPN) and 11% service charge." />
        <Field label="Tax & service (21%)" htmlFor="taxMode">
          <select id="taxMode" className={inputClass} {...register("opts.taxMode")}>
            <option value="excl">Added on top of the prices</option>
            <option value="incl">Already included in the prices</option>
            <option value="none">Not applied</option>
          </select>
        </Field>
        <p className="pt-1 text-xs text-muted">
          Text in the preview can be changed directly. Edited text is marked with a blue outline; clear it to restore the original.
        </p>
      </Section>
    </div>
  );
}