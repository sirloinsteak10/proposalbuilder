import type { LineItem, ProposalData } from "@/lib/schemas/proposal";

/** Oshom Bali tax components (buyout & wedding package T&Cs): 10% PPN + 11% service = 21%. */
export const TAX_COMPONENTS = {
  government: 0.1,
  service: 0.11,
} as const;
export const TAX_RATE = TAX_COMPONENTS.government + TAX_COMPONENTS.service; // 0.21
export const TAX_RATE_LABEL = "21%";

export type Section = "venue" | "seats" | "ent" | "fb" | "extras" | "items";

export interface PricedRow {
  id: string;
  name: string;
  desc: string;
  qty: number;
  unit: number;
  perPax: boolean;
  amount: number;
}

export interface PricedSection {
  key: Section;
  rows: PricedRow[];
  subtotal: number;
}

export interface Summary {
  pax: number;
  sections: PricedSection[];
  /** Sum of all lines before the seat discount is taken off. */
  gross: number;
  seatDiscountPct: number;
  seatDiscountAmount: number;
  /** Sum of all lines after discounts, before/after tax depending on taxMode. */
  subtotal: number;
  tax: number;
  taxParts: { government: number; service: number };
  total: number;
  deposit: number;
  balance: number;
  perPerson: number | null;
}

const round = (n: number) => Math.round(n);

/** Parse a user-typed number of guests. Returns 0 for empty or invalid input. */
export function parsePax(pax: string | number): number {
  const n = Number.parseInt(String(pax).replace(/[^\d]/g, ""), 10);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function parsePct(pct: string | number): number {
  const n = Number.parseFloat(String(pct).replace(",", "."));
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

export function priceRow(item: LineItem, pax: number): PricedRow {
  const qty = item.perPax ? pax : item.qty;
  return {
    id: item.id,
    name: item.name,
    desc: item.desc,
    qty,
    unit: item.price,
    perPax: item.perPax,
    amount: round(qty * item.price),
  };
}

function section(key: Section, items: LineItem[], pax: number): PricedSection {
  // Skip rows with neither a name nor a price so empty form rows do not appear.
  const rows = items.filter((i) => i.name.trim() || i.price > 0).map((i) => priceRow(i, pax));
  return { key, rows, subtotal: rows.reduce((s, r) => s + r.amount, 0) };
}

export function computeSummary(data: ProposalData): Summary {
  const pax = parsePax(data.pax);

  const rental: PricedRow[] =
    data.rentalPrice > 0
      ? [
          {
            id: "rental",
            name: data.rentalDesc || "Venue rental",
            desc: "",
            qty: 1,
            unit: data.rentalPrice,
            perPax: false,
            amount: round(data.rentalPrice),
          },
        ]
      : [];
  const venueExtra = section("venue", data.extraVenues, pax);
  const venue: PricedSection = {
    key: "venue",
    rows: [...rental, ...venueExtra.rows],
    subtotal: rental.reduce((s, r) => s + r.amount, 0) + venueExtra.subtotal,
  };

  const seats = section("seats", data.seats, pax);
  const ent = section("ent", data.ent, pax);
  const fb = section("fb", data.fb, pax);
  const extras = section("extras", data.extras, pax);
  const items = section("items", data.items, pax);

  const seatDiscountPct = parsePct(data.seatDisc.pct);
  const seatDiscountAmount = round((seats.subtotal * seatDiscountPct) / 100);

  const rentalInSummary = data.rentalInSummary;
  const venueTotal = rentalInSummary ? venue.subtotal : venueExtra.subtotal;

  const sections = [
    rentalInSummary ? venue : { ...venue, rows: venueExtra.rows, subtotal: venueExtra.subtotal },
    seats,
    ent,
    fb,
    extras,
    items,
  ];

  const lineTotal =
    venueTotal + seats.subtotal - seatDiscountAmount + ent.subtotal + fb.subtotal + extras.subtotal + items.subtotal;

  let subtotal: number;
  let tax: number;
  let total: number;
  switch (data.opts.taxMode) {
    case "incl": {
      // Entered prices already contain tax & service.
      total = lineTotal;
      subtotal = round(lineTotal / (1 + TAX_RATE));
      tax = total - subtotal;
      break;
    }
    case "none": {
      subtotal = lineTotal;
      tax = 0;
      total = lineTotal;
      break;
    }
    default: {
      subtotal = lineTotal;
      tax = round(lineTotal * TAX_RATE);
      total = subtotal + tax;
    }
  }

  const government = round(subtotal * TAX_COMPONENTS.government);
  // Put rounding remainder on the service charge so the parts always sum to `tax`.
  const taxParts =
    tax === 0 ? { government: 0, service: 0 } : { government, service: tax - government };

  const deposit = round(total / 2);
  const balance = total - deposit;

  return {
    pax,
    sections,
    gross: lineTotal + seatDiscountAmount,
    seatDiscountPct,
    seatDiscountAmount,
    subtotal,
    tax,
    taxParts,
    total,
    deposit,
    balance,
    perPerson: pax > 0 ? round(total / pax) : null,
  };
}

export function formatIdr(n: number): string {
  const sign = n < 0 ? "-" : "";
  return `${sign}Rp ${Math.abs(Math.round(n)).toLocaleString("id-ID")}`;
}
