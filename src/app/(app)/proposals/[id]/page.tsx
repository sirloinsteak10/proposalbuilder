import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { accessWhere, toDto } from "@/lib/proposals";
import type { VenueDto } from "@/lib/venues";
import { ProposalEditor } from "@/components/editor/proposal-editor";

export const dynamic = "force-dynamic";

export default async function EditProposalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !/^[a-z0-9]{20,32}$/.test(id)) notFound();

  const [row, venues] = await Promise.all([
    prisma.proposal.findFirst({ where: accessWhere(id, user) }),
    prisma.venue.findMany({ where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] }),
  ]);
  if (!row) notFound();

  const venueDtos: VenueDto[] = venues.map((v) => ({
    key: v.key,
    name: v.name,
    tagline: v.tagline,
    description: v.description,
    seated: v.seated,
    standing: v.standing,
    features: v.features,
    suitableFor: v.suitableFor,
    imageUrl: v.imageUrl,
  }));

  return <ProposalEditor initial={toDto(row)} venues={venueDtos} />;
}
