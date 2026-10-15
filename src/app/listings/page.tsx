import { PageHeader } from "@/components/domain/layout";
import { ListingBoard } from "@/components/features/listing-board";
import { DataNote } from "@/components/domain/notes";

export const metadata = {
  title: "Marketplace",
  description:
    "Buy and sell listings with explained matches. MandiLens ranks potential counterparties and shows why.",
};

export default function ListingsPage() {
  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        eyebrow="Marketplace"
        title="Listings"
        description="Post what you're selling or looking for. MandiLens surfaces potential counterparties and explains every match — as leads to investigate, not guarantees."
      />
      <ListingBoard />
      <DataNote>
        Listings are user-generated. MandiLens does not verify quantities, quality or payment. Meet
        in a safe place, inspect goods, and settle payment through a method you trust.
      </DataNote>
    </div>
  );
}
