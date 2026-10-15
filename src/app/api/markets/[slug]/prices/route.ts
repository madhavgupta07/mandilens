import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { getMarketBySlug } from "@/lib/services/catalog";
import { getLatestPricesByCommodity } from "@/lib/services/prices";
import type { DataMode } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ slug: string }> }>(
  async (request: NextRequest, context) => {
    const { slug } = await context.params;
    const market = await getMarketBySlug(slug);
    if (!market) throw ApiError.notFound("Market not found.");

    const mode = (request.nextUrl.searchParams.get("mode") as DataMode | "all" | null) ?? "all";
    const rows = await getLatestPricesByCommodity({ marketId: String(market._id), mode });

    return ok(rows, { market: { id: String(market._id), name: market.name, slug: market.slug } });
  },
);
