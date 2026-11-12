import { z } from "zod";
import { prisma } from "@/lib/db";
import { ApiError } from "@/lib/api";
import { newProposalData } from "@/lib/proposal-defaults";
import type { SessionUser } from "@/lib/session";
import { proposalDataSchema, type ProposalData } from "@/lib/schemas/proposal";
import type { Prisma } from "@/generated/prisma/client";

export const STATUSES = ["DRAFT", "SENT", "CONFIRMED", "ARCHIVED"] as const;
export type Status = (typeof STATUSES)[number];

export interface ProposalDto {
  id: string;
  title: string;
  status: Status;
  version: number;
  data: ProposalData;
  createdAt: string;
  updatedAt: string;
}

export interface ProposalListItem {
  id: string;
  title: string;
  status: Status;
  updatedAt: string;
  eventDate: string;
  guestName: string;
  ownerName: string;
}

export function deriveTitle(data: ProposalData): string {
  const who = data.company.trim() || data.guestName.trim();
  const what = data.eventName.trim();
  const title = [who, what].filter(Boolean).join(" - ");
  return (title || "Untitled proposal").slice(0, 200);
}

export function parseStoredData(raw: unknown): ProposalData {
  const parsed = proposalDataSchema.safeParse(raw);
  return parsed.success ? parsed.data : proposalDataSchema.parse({});
}

type Row = Prisma.ProposalGetPayload<object>;

export function toDto(row: Row): ProposalDto {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    version: row.version,
    data: parseStoredData(row.data),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

/** Admins can open every proposal; staff only their own. Throws 404 so ids are not enumerable. */
export function accessWhere(id: string, user: SessionUser): Prisma.ProposalWhereInput {
  return user.role === "ADMIN" ? { id } : { id, ownerId: user.id };
}

export async function getOwnedProposal(id: string, user: SessionUser): Promise<Row> {
  const row = await prisma.proposal.findFirst({ where: accessWhere(id, user) });
  if (!row) throw new ApiError(404, "Proposal not found");
  return row;
}

const defaultsSchema = z.object({
  pics: z
    .object({
      picName: z.string(),
      picTitle: z.string(),
      picEmail: z.string(),
      picPhone: z.string(),
      pic2Name: z.string(),
      pic2Title: z.string(),
      pic2Email: z.string(),
      pic2Phone: z.string(),
    })
    .partial()
    .optional(),
  paymentTerms: z.string().optional(),
  terms: z.array(z.string()).optional(),
});

/** Admin-editable defaults (Setting table) layered over the built-in ones. */
export async function loadNewProposalData(overrides: Partial<ProposalData> = {}): Promise<ProposalData> {
  const row = await prisma.setting.findUnique({ where: { key: "defaults" } });
  const parsed = defaultsSchema.safeParse(row?.value);
  const d = parsed.success ? parsed.data : {};
  return newProposalData({
    ...(d.pics ?? {}),
    ...(d.paymentTerms ? { paymentTerms: d.paymentTerms } : {}),
    ...(d.terms ? { terms: d.terms } : {}),
    ...overrides,
  });
}

export function safeFileName(title: string, ext: string): string {
  const base = title.replace(/[^\p{L}\p{N} _.-]+/gu, "").trim().slice(0, 80) || "Proposal";
  return `${base}.${ext}`;
}
