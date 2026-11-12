"use client";

import { useState, type ReactNode } from "react";
import { useFormContext } from "react-hook-form";
import type { ProposalInput } from "@/lib/schemas/proposal";

type TextPath =
  | "guestName"
  | "company"
  | "issueDate"
  | "picName"
  | "picTitle"
  | "picEmail"
  | "picPhone"
  | "pic2Name"
  | "pic2Title"
  | "pic2Email"
  | "pic2Phone"
  | "balanceDate"
  | "eventName"
  | "eventDate"
  | "timeFrom"
  | "timeTo"
  | "pax"
  | "venueOther"
  | "rentalDesc"
  | "fbNotes"
  | "extrasCustom"
  | "paymentTerms"
  | "seatDisc.label"
  | "seatDisc.pct";

export const inputClass =
  "h-10 w-full rounded-lg border border-hair bg-white px-3 text-sm text-ink outline-none transition placeholder:text-muted/60 focus:border-teal focus:ring-2 focus:ring-teal/20";
export const labelClass = "mb-1 block text-[11px] font-semibold tracking-wide text-muted uppercase";

export function toNum(v: unknown): number {
  if (v === "" || v == null) return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function Field({ label, htmlFor, children, hint }: { label: string; htmlFor: string; children: ReactNode; hint?: string }) {
  return (
    <div>
      <label htmlFor={htmlFor} className={labelClass}>
        {label}
      </label>
      {children}
      {hint ? <p className="mt-1 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function TextField({
  name,
  label,
  type = "text",
  placeholder,
  hint,
  inputMode,
}: {
  name: TextPath;
  label: string;
  type?: "text" | "date" | "time" | "email" | "tel";
  placeholder?: string;
  hint?: string;
  inputMode?: "numeric" | "decimal" | "text";
}) {
  const { register } = useFormContext<ProposalInput>();
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <input id={name} type={type} placeholder={placeholder} inputMode={inputMode} className={inputClass} {...register(name)} />
    </Field>
  );
}

export function TextAreaField({
  name,
  label,
  rows = 4,
  hint,
}: {
  name: TextPath;
  label: string;
  rows?: number;
  hint?: string;
}) {
  const { register } = useFormContext<ProposalInput>();
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <textarea
        id={name}
        rows={rows}
        className="w-full rounded-lg border border-hair bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-teal focus:ring-2 focus:ring-teal/20"
        {...register(name)}
      />
    </Field>
  );
}

export function NumberField({ name, label, hint }: { name: "rentalPrice"; label: string; hint?: string }) {
  const { register } = useFormContext<ProposalInput>();
  return (
    <Field label={label} htmlFor={name} hint={hint}>
      <input id={name} type="number" min={0} step={1000} inputMode="numeric" className={inputClass} {...register(name, { setValueAs: toNum })} />
    </Field>
  );
}

export function Toggle({
  name,
  label,
  hint,
}: {
  name: "rentalInSummary" | "seatCredit" | `opts.${"cover" | "venuePage" | "menuPage" | "closing" | "splitTax" | "perPerson"}`;
  label: string;
  hint?: string;
}) {
  const { register } = useFormContext<ProposalInput>();
  return (
    <label className="flex cursor-pointer items-start gap-3 py-1.5">
      <input type="checkbox" className="mt-0.5 h-4 w-4 flex-none accent-teal" {...register(name)} />
      <span className="text-sm text-ink">
        {label}
        {hint ? <span className="block text-xs text-muted">{hint}</span> : null}
      </span>
    </label>
  );
}

export function Section({
  title,
  summary,
  defaultOpen = false,
  children,
}: {
  title: string;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <section className="border-b border-hair">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper"
        >
          <span className="text-sm font-semibold text-ink">{title}</span>
          <span className="flex items-center gap-3">
            {summary ? <span className="text-xs text-muted">{summary}</span> : null}
            <span aria-hidden className={`text-muted transition ${open ? "rotate-90" : ""}`}>
              ›
            </span>
          </span>
        </button>
      </h2>
      {open ? <div className="space-y-3 px-4 pt-1 pb-5">{children}</div> : null}
    </section>
  );
}
