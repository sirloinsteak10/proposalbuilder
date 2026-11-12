import { handle, requireUser, validId } from "@/lib/api";
import { getOwnedProposal, safeFileName } from "@/lib/proposals";
import { renderProposalPdf } from "@/lib/pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

type Ctx = { params: Promise<{ id: string }> };

export const GET = handle<Ctx>(async (req, { params }) => {
  const user = await requireUser(req);
  const row = await getOwnedProposal(validId((await params).id), user);
  const pdf = await renderProposalPdf(row.id);
  const name = safeFileName(row.title, "pdf");
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name.replace(/[^\x20-\x7e]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store",
    },
  });
});
