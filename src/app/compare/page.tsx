import { PageHeader } from "@/components/domain/layout";
import { CompareWorkbench } from "@/components/features/compare-workbench";
import { DataNote } from "@/components/domain/notes";

export const metadata = {
  title: "Compare markets",
  description:
    "Compare mandi prices by net proceeds after transport, loading and market charges. Exact decimal arithmetic, transparent assumptions.",
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ commodity?: string; quantity?: string; unit?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="container-page space-y-8 py-10">
      <PageHeader
        eyebrow="Flagship tool"
        title="The compare workbench"
        description="Rank markets by what you actually keep — not by the headline price. Costs are subtracted market by market, with every rupee computed exactly."
      />
      <DataNote>
        MandiLens ranks only within a single record type (reported market prices by default) so it
        never mixes an official quote with a user-submitted guess. When you filter to real data,
        demo records are excluded entirely.
      </DataNote>
      <CompareWorkbench
        initialCommoditySlug={params.commodity}
        initialQuantity={params.quantity}
        initialUnit={params.unit}
      />
    </div>
  );
}
