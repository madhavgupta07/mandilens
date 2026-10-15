import { notFound } from "next/navigation";
import { CommodityExplorer } from "@/components/features/commodity-explorer";
import { getCommodityBySlug } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const commodity = await getCommodityBySlug(slug);
    if (!commodity) return { title: "Commodity not found" };
    return {
      title: `${commodity.name} prices`,
      description: `Latest reported mandi prices, trends and freshness for ${commodity.name} across markets.`,
    };
  } catch {
    return { title: "Commodity" };
  }
}

export default async function CommodityDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let exists = true;
  try {
    const commodity = await getCommodityBySlug(slug);
    exists = Boolean(commodity);
  } catch {
    exists = true;
  }
  if (!exists) notFound();

  return (
    <div className="container-page py-10">
      <CommodityExplorer slug={slug} />
    </div>
  );
}
