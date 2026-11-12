import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser, verifyPrintToken } from "@/lib/session";
import { accessWhere, parseStoredData } from "@/lib/proposals";
import { ProposalDocument } from "@/components/document/ProposalDocument";
import type { VenueDto } from "@/lib/venues";

export const dynamic = "force-dynamic";
export const metadata = { title: "Proposal", robots: { index: false, follow: false } };

/**
 * Print view used by the PDF exporter. Reachable with a signed one-minute token (headless browser)
 * or with a normal signed-in session (handy for checking the print layout in a browser).
 */
export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string }>;
}) {
  const { id } = await params;
  const { t } = await searchParams;
  if (!/^[a-z0-9]{20,32}$/.test(id)) notFound();

  let row;
  if (await verifyPrintToken(t, id)) {
    row = await prisma.proposal.findUnique({ where: { id } });
  } else {
    const user = await getCurrentUser();
    if (!user) notFound();
    row = await prisma.proposal.findFirst({ where: accessWhere(id, user) });
  }
  if (!row) notFound();

  const data = parseStoredData(row.data);
  const v = await prisma.venue.findUnique({ where: { key: data.venueKey } });
  const venue: VenueDto | null = v
    ? {
        key: v.key,
        name: v.name,
        tagline: v.tagline,
        description: v.description,
        seated: v.seated,
        standing: v.standing,
        features: v.features,
        suitableFor: v.suitableFor,
        imageUrl: v.imageUrl,
      }
    : null;

  return <ProposalDocument data={data} venue={venue} />;
}
