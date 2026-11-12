import type { Lang } from "@/lib/i18n";
import { t } from "@/lib/i18n";
import type { ProposalData } from "@/lib/schemas/proposal";
import { formatIdr, type Summary } from "@/lib/pricing";

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** "Wednesday 11 November 2026" (or Indonesian equivalent). Empty string for invalid input. */
export function longDate(iso: string, lang: Lang): string {
  const m = ISO.exec(iso);
  if (!m) return "";
  const date = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
  if (Number.isNaN(date.getTime())) return "";
  const parts = new Intl.DateTimeFormat(lang === "id" ? "id-ID" : "en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).formatToParts(date);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("weekday")} ${get("day")} ${get("month")} ${get("year")}`;
}

export function timeRange(from: string, to: string, tbc: string): string {
  if (from && to) return `${from} - ${to}`;
  if (from) return from;
  return tbc;
}

export function replacePlaceholders(text: string, data: ProposalData, summary: Summary): string {
  const balanceDate = longDate(data.balanceDate, data.lang) || t(data.lang).tbc;
  return text
    .replaceAll("{DEPOSIT}", formatIdr(summary.deposit))
    .replaceAll("{BALANCE_DATE}", balanceDate)
    .replaceAll("{BALANCE}", formatIdr(summary.balance));
}

export function venueLabel(data: ProposalData, venueName: string | undefined): string {
  if (data.venueKey === "other") return data.venueOther.trim() || "—";
  return venueName ?? (data.venueOther.trim() || "—");
}
