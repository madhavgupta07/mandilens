import { notFound } from "next/navigation";
import { MarketDetail } from "@/components/features/market-detail";
import { getMarketBySlug } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const market = await getMarketBySlug(slug);
    if (!market) return { title: "Market not found" };
    return {
      title: `${market.name}, ${market.district}`,
      description: `Latest commodity prices reported by ${market.name} market in ${market.district}, ${market.state}.`,
    };
  } catch {
    return { title: "Market" };
  }
}

export default async function MarketDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  let exists = true;
  try {
    const market = await getMarketBySlug(slug);
    exists = Boolean(market);
  } catch {
    exists = true;
  }
  if (!exists) notFound();

  return (
    <div className="container-page py-10">
      <MarketDetail slug={slug} />
    </div>
  );
}
