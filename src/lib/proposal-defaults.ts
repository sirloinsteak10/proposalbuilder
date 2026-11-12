import { proposalDataSchema, type ProposalData } from "@/lib/schemas/proposal";

export const DEFAULT_PAYMENT_TERMS = [
  "1st deposit 50% required upon signing of the agreement: {DEPOSIT}",
  "Balance payment due no later than 30 days prior to the event date: {BALANCE}",
  "For exclusive buyouts, the remaining 50% balance is due no later than 60 days prior to the first day of the buyout period.",
  "Proof of transfer is to be emailed to: sales@oshombali.com and booking@oshombali.com",
  "Deposit payment is non-refundable except as stated in the cancellation policy.",
].join("\n");

export const DEFAULT_TERMS: string[] = [
  "Confirmation: bookings are confirmed upon receipt of a signed agreement and a minimum deposit of 50% of the total cost.",
  "Cancellation (≥60 days before the event): 50% of the deposit is refundable; the remaining 50% of the deposit is forfeited.",
  "Cancellation (30–59 days before the event): 100% of the deposit is forfeited and non-refundable.",
  "Cancellation (<30 days before the event) or no-show: the client is liable for 100% of the total event cost, less amounts already paid.",
  "Amendments: the final guaranteed guest count and detailed itinerary must be submitted no later than 30 days prior to the event.",
  "Dietary restrictions: special dietary requirements or allergies must be communicated 14 days prior to the event.",
  "Corkage: external food & beverage requires prior written approval. Fees (incl. tax & service): Wine IDR 450,000/bottle; Spirits IDR 750,000/bottle; Champagne IDR 600,000/bottle; Beer IDR 50,000/bottle; Cake/dessert IDR 400,000/item. Corkage must be paid in full 7 days before the event; undeclared items incur a 50% surcharge.",
  "Tax & service: all net rates are subject to a 21% charge comprising 10% government tax (PPN) and 11% service charge, unless explicitly stated otherwise.",
  "Timeline: event setup begins 3 hours prior to start; clear-up within 3 hours after the event. Events must conclude by 10:00 PM unless prior agreement is made.",
  "Vendors: all external vendors must be pre-approved by Oshom Bali; a vendor list with contacts is due 14 days before the event.",
  "Liability: a refundable security deposit of IDR 5,000,000 is required and returned after the event if no damages are incurred. The client is responsible for damages caused by guests, vendors, or associated third parties.",
  "Force majeure: Oshom Bali is not liable for failure or delay due to circumstances beyond reasonable control (including natural disasters, government regulations, public health emergencies, or other causes that make hosting the event impossible or commercially impracticable).",
];

export const DEFAULT_PICS = {
  picName: "Oshom Bali Events Team",
  picTitle: "Events",
  picEmail: "sales@oshombali.com",
  picPhone: "+6282138799869",
  pic2Name: "Dina Jayanira",
  pic2Title: "Front Office Manager",
  pic2Email: "fom@oshombali.com",
  pic2Phone: "+6282147551758",
} as const;

/** Corkage schedule from Oshom Bali Corkage Charge Policy (fees include tax & service). */
export const CORKAGE_FEES = [
  { item: "Wine (750 ml)", fee: 450_000, note: "Per bottle, incl. tax & service" },
  { item: "Spirits / Liquor", fee: 750_000, note: "Per bottle, incl. tax & service" },
  { item: "Champagne", fee: 600_000, note: "Per bottle, incl. tax & service" },
  { item: "Beer", fee: 50_000, note: "Per bottle, incl. tax & service" },
  { item: "Cake / Dessert", fee: 400_000, note: "Per item, external bakery" },
] as const;

export function todayIso(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** A blank proposal pre-filled with the standard PICs, payment terms and T&C. */
export function newProposalData(overrides: Partial<ProposalData> = {}): ProposalData {
  return proposalDataSchema.parse({
    issueDate: todayIso(),
    ...DEFAULT_PICS,
    venueKey: "lawn",
    paymentTerms: DEFAULT_PAYMENT_TERMS,
    terms: DEFAULT_TERMS,
    ...overrides,
  });
}
