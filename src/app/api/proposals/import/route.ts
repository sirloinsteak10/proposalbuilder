import { ApiError, handle, json, readJson, requireUser } from "@/lib/api";
import { prisma } from "@/lib/db";
import {
  PROPOSAL_FILE_MAX_BYTES,
  proposalDataSchema,
  proposalFileSchema,
  type ProposalData,
} from "@/lib/schemas/proposal";
import { deriveTitle, toDto } from "@/lib/proposals";
import type { Prisma } from "@/generated/prisma/client";

/** Creates a proposal from a `.proposal.json` file (envelope) or from a bare data object. */
export const POST = handle(async (req) => {
  const user = await requireUser(req);
  const body = await readJson(req, PROPOSAL_FILE_MAX_BYTES);
  if (typeof body !== "object" || body === null) throw new ApiError(400, "Not a proposal file");

  let clean: ProposalData;
  if ("app" in body) {
    const parsed = proposalFileSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "This file is not a valid Oshom proposal (app oshom-proposal, v1)");
    clean = parsed.data.data;
  } else {
    const parsed = proposalDataSchema.safeParse(body);
    if (!parsed.success) throw new ApiError(400, "Invalid proposal data");
    clean = parsed.data;
  }
  const row = await prisma.proposal.create({
    data: { ownerId: user.id, title: deriveTitle(clean), data: clean as unknown as Prisma.InputJsonValue },
  });
  return json(toDto(row), 201);
});
