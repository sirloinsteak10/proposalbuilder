import { z } from "zod";

/**
 * Proposal data model. Compatible with the saved `.proposal.json` files
 * (app "oshom-proposal", v1). Every field has a default so older or partial
 * files import cleanly.
 */

export const LANGS = ["en", "id"] as const;
export const TAX_MODES = ["excl", "incl", "none"] as const;

const money = z.number().finite().min(0).max(1_000_000_000_000);
const text = (max: number) => z.string().max(max);

/** One priced row. Used by seats, entertainment, F&B, extras and custom items. */
export const lineItemSchema = z.object({
  id: text(64).default(""),
  name: text(200).default(""),
  desc: text(1000).default(""),
  qty: z.number().finite().min(0).max(1_000_000).default(1),
  price: money.default(0),
  /** When true the price is per guest and the quantity is the guest count (pax). */
  perPax: z.boolean().default(false),
});
export type LineItem = z.infer<typeof lineItemSchema>;

export const picSchema = z.object({
  name: text(120).default(""),
  title: text(120).default(""),
  email: text(200).default(""),
  phone: text(60).default(""),
});

export const rundownRowSchema = z.object({
  t: text(60).default(""),
  a: text(500).default(""),
});

export const optsSchema = z.object({
  cover: z.boolean().default(true),
  venuePage: z.boolean().default(true),
  menuPage: z.boolean().default(true),
  closing: z.boolean().default(true),
  splitTax: z.boolean().default(false),
  perPerson: z.boolean().default(true),
  taxMode: z.enum(TAX_MODES).default("excl"),
});
export type ProposalOpts = z.infer<typeof optsSchema>;

export const proposalDataSchema = z.object({
  lang: z.enum(LANGS).default("en"),
  issueDate: text(10).default(""),

  guestName: text(200).default(""),
  company: text(200).default(""),

  picName: text(120).default(""),
  picTitle: text(120).default(""),
  picEmail: text(200).default(""),
  picPhone: text(60).default(""),
  pic2Name: text(120).default(""),
  pic2Title: text(120).default(""),
  pic2Email: text(200).default(""),
  pic2Phone: text(60).default(""),

  balanceDate: text(10).default(""),

  eventName: text(200).default(""),
  eventDate: text(10).default(""),
  timeFrom: text(10).default(""),
  timeTo: text(10).default(""),
  pax: z
    .union([z.string(), z.number()])
    .transform((v) => String(v).slice(0, 8))
    .default(""),

  venueKey: text(64).default(""),
  venueOther: text(200).default(""),
  rentalDesc: text(500).default(""),
  rentalPrice: money.default(0),
  rentalInSummary: z.boolean().default(true),
  extraVenues: z.array(lineItemSchema).max(30).default([]),

  seats: z.array(lineItemSchema).max(60).default([]),
  seatDisc: z
    .object({
      label: text(120).default(""),
      pct: z
        .union([z.string(), z.number()])
        .transform((v) => String(v).slice(0, 6))
        .default(""),
    })
    .default({ label: "", pct: "" }),
  /** Seat charge is redeemable as Food & Beverage credit (shown as a note). */
  seatCredit: z.boolean().default(false),

  ent: z.array(lineItemSchema).max(60).default([]),
  fb: z.array(lineItemSchema).max(100).default([]),
  fbNotes: text(4000).default(""),
  extras: z.array(lineItemSchema).max(60).default([]),
  extrasCustom: text(4000).default(""),

  rundown: z.array(rundownRowSchema).max(80).default([{ t: "", a: "" }]),
  items: z.array(lineItemSchema).max(100).default([]),

  paymentTerms: text(6000).default(""),
  terms: z.array(text(2000)).max(40).default([]),

  /** Per-field text overrides, keyed by preview field id. */
  edits: z.record(z.string().max(80), z.string().max(4000)).default({}),
  opts: optsSchema.default(() => optsSchema.parse({})),
});
export type ProposalData = z.infer<typeof proposalDataSchema>;
export type ProposalInput = z.input<typeof proposalDataSchema>;

/** File envelope used by "Save as file" / "Import". */
export const proposalFileSchema = z.object({
  app: z.literal("oshom-proposal"),
  v: z.literal(1),
  savedAt: z.string().optional(),
  data: proposalDataSchema,
});
export type ProposalFile = z.infer<typeof proposalFileSchema>;

export const PROPOSAL_FILE_MAX_BYTES = 512 * 1024;
