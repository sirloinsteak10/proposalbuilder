import { handle, requireUser, validId } from "@/lib/api";
import { getOwnedProposal, parseStoredData, safeFileName } from "@/lib/proposals";
import { todayIso } from "@/lib/proposal-defaults";

type Ctx = { params: Promise<{ id: string }> };

/** Downloads the proposal as a `.proposal.json` file (same format the importer reads). */
export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const row = await getOwnedProposal(validId((await params).id), user);
  const file = { app: "oshom-proposal", v: 1, savedAt: new Date().toISOString(), data: parseStoredData(row.data) };
  const name = safeFileName(`Proposal ${todayIso()}`, "proposal.json");
  return new Response(JSON.stringify(file), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
});
