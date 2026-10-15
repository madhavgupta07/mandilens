import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { getMarketBySlug } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ slug: string }> }>(
  async (_request: NextRequest, context) => {
    const { slug } = await context.params;
    const market = await getMarketBySlug(slug);
    if (!market) throw ApiError.notFound("Market not found.");
    return ok({
      id: String(market._id),
      name: market.name,
      slug: market.slug,
      state: market.state,
      district: market.district,
      block: market.block,
      marketType: market.marketType,
      description: market.description,
      isDemo: market.isDemo,
      isActive: market.isActive,
    });
  },
);
