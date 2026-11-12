import { ProposalList } from "./proposal-list";

export const metadata = { title: "Proposals · Oshom Proposal Builder" };

export default function ProposalsPage() {
  return (
    <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
      <ProposalList />
    </main>
  );
}
