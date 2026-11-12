import { z } from "zod";
import { ApiError, handle, json, jsonError, readJson, requireUser, validId } from "@/lib/api";
import { prisma } from "@/lib/db";
import { proposalDataSchema } from "@/lib/schemas/proposal";
import { accessWhere, deriveTitle, getOwnedProposal, STATUSES, toDto } from "@/lib/proposals";
import type { Prisma } from "@/generated/prisma/client";

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const row = await getOwnedProposal(validId((await params).id), user);
  return json(toDto(row));
});

const patchSchema = z
  .object({
    /** Version the client last saw. Used to detect edits made elsewhere. */
    version: z.number().int().min(1),
    title: z.string().trim().min(1).max(200).optional(),
    status: z.enum(STATUSES).optional(),
    data: z.unknown().optional(),
  })
  .strict();

export const PATCH = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = validId((await params).id);
  const body = patchSchema.parse(await readJson(req));
  const existing = await getOwnedProposal(id, user);

  const data = body.data === undefined ? undefined : proposalDataSchema.parse(body.data);
  const result = await prisma.proposal.updateMany({
    where: { ...accessWhere(id, user), version: body.version },
    data: {
      ...(data ? { data: data as unknown as Prisma.InputJsonValue, title: body.title ?? deriveTitle(data) } : {}),
      ...(!data && body.title ? { title: body.title } : {}),
      ...(body.status ? { status: body.status } : {}),
      version: { increment: 1 },
    },
  });
  if (result.count === 0) {
    return jsonError(409, "This proposal was changed elsewhere. Reload to get the latest version.", {
      currentVersion: existing.version,
    });
  }
  const row = await getOwnedProposal(id, user);
  return json(toDto(row));
});

export const DELETE = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const id = validId((await params).id);
  const result = await prisma.proposal.deleteMany({ where: accessWhere(id, user) });
  if (result.count === 0) throw new ApiError(404, "Proposal not found");
  return json({ ok: true });
});
