import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { getCommodityBySlug, getMarketBySlug } from "@/lib/services/catalog";
import { getLatestPricesByMarket, getPriceHistory, getFreshnessSummary } from "@/lib/services/prices";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ slug: string }> }>(
  async (request: NextRequest, context) => {
    const { slug } = await context.params;
    const commodity = await getCommodityBySlug(slug);
    if (!commodity) throw ApiError.notFound("Commodity not found.");

    const params = request.nextUrl.searchParams;
    const mode = (params.get("mode") as "real" | "demo" | "all" | null) ?? "all";
    const district = params.get("district") ?? undefined;
    const state = params.get("state") ?? undefined;
    const days = Number.parseInt(params.get("days") ?? "30", 10);
    const marketSlug = params.get("market");

    let marketIds: string[] | undefined;
    if (marketSlug) {
      const market = await getMarketBySlug(marketSlug);
      marketIds = market ? [String(market._id)] : [];
    }

    const [latest, freshness] = await Promise.all([
      getLatestPricesByMarket({
        commodityId: String(commodity._id),
        marketIds,
        mode,
      }),
      getFreshnessSummary({
        commodityId: String(commodity._id),
        marketIds,
        mode,
      }),
    ]);

    const marketMap = new Map<string, { name: string; slug: string; district: string; state: string }>();
    const { Market } = await import("@/lib/db/models");
    const marketDocs = await Market.find({
      _id: { $in: latest.map((row) => row.marketId) },
    })
      .select("name slug district state")
      .lean();
    for (const m of marketDocs) {
      marketMap.set(String(m._id), {
        name: m.name,
        slug: m.slug,
        district: m.district,
        state: m.state,
      });
    }

    const filteredLatest = latest
      .filter((row) => (!district && !state) || (row.marketId && marketMap.has(row.marketId)))
      .map((row) => ({ ...row, market: marketMap.get(row.marketId) ?? null }));

    const history =
      days > 0
        ? await getPriceHistory({
            commodityId: String(commodity._id),
            marketId: marketIds?.[0],
            mode,
            sinceDays: days,
            limit: 1000,
          })
        : [];

    return ok({
      commodity: {
        id: String(commodity._id),
        name: commodity.name,
        slug: commodity.slug,
        hindiName: commodity.hindiName,
        category: commodity.category,
        defaultUnit: commodity.defaultUnit,
        isDemo: commodity.isDemo,
      },
      latest: filteredLatest,
      history,
      freshness,
    });
  },
);
