import { z } from "zod";
import { ApiError, handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import { proposalDataSchema } from "@/lib/schemas/proposal";
import {
  deriveTitle,
  loadNewProposalData,
  parseStoredData,
  STATUSES,
  toDto,
  type ProposalListItem,
} from "@/lib/proposals";
import type { Prisma } from "@/generated/prisma/client";

const querySchema = z.object({
  q: z.string().trim().max(100).optional(),
  status: z.enum(STATUSES).optional(),
});

export const GET = handle(async (req) => {
  const user = await requireUser(req);
  const { q, status } = querySchema.parse(Object.fromEntries(new URL(req.url).searchParams));
  const where: Prisma.ProposalWhereInput = {
    ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
    ...(status ? { status } : {}),
    ...(q ? { title: { contains: q, mode: "insensitive" } } : {}),
  };
  const rows = await prisma.proposal.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    take: 200,
    include: { owner: { select: { name: true } } },
  });
  const items: ProposalListItem[] = rows.map((r) => {
    const data = parseStoredData(r.data);
    return {
      id: r.id,
      title: r.title,
      status: r.status,
      updatedAt: r.updatedAt.toISOString(),
      eventDate: data.eventDate,
      guestName: data.guestName,
      ownerName: r.owner.name,
    };
  });
  return json({ items });
});

const createSchema = z.object({ data: z.unknown().optional() });

export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const hasBody = Number(req.headers.get("content-length") ?? 0) > 0;
  const body = hasBody ? createSchema.parse(await readJson(req)) : {};
  if (body.data !== undefined && (typeof body.data !== "object" || body.data === null)) {
    throw new ApiError(400, "data must be an object");
  }
  const data = body.data ? proposalDataSchema.parse(body.data) : await loadNewProposalData();
  const row = await prisma.proposal.create({
    data: { ownerId: user.id, title: deriveTitle(data), data: data as unknown as Prisma.InputJsonValue },
  });
  return json(toDto(row), 201);
});
