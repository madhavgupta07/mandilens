import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { getCommodityById, getCommodityBySlug, findCommodityByName, listMarkets } from "@/lib/services/catalog";
import { getLatestPricesByMarket } from "@/lib/services/prices";
import type { DataMode } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const mode = (params.get("mode") as DataMode | "all" | null) ?? "all";

  const commodityId = params.get("commodityId");
  const commoditySlug = params.get("commoditySlug");
  const commodityName = params.get("commodity");

  const commodity =
    (commodityId ? await getCommodityById(commodityId) : null) ??
    (commoditySlug ? await getCommodityBySlug(commoditySlug) : null) ??
    (commodityName ? await findCommodityByName(commodityName, mode) : null);

  if (!commodity) {
    throw ApiError.badRequest("Provide a valid commodityId, commoditySlug or commodity name.", {
      commodityId,
      commoditySlug,
      commodityName,
    });
  }

  let marketIds: string[] | undefined;
  const district = params.get("district") ?? undefined;
  const state = params.get("state") ?? undefined;
  if (district || state) {
    const { items } = await listMarkets({ district, state, mode, limit: 200 });
    marketIds = items.map((market) => String(market._id));
    if (marketIds.length === 0) {
      return ok([], { commodity: commodity.name, note: "No markets found in the requested area." });
    }
  }

  const rows = await getLatestPricesByMarket({
    commodityId: String(commodity._id),
    marketIds,
    mode,
  });

  const marketInfo = new Map<string, { name: string; slug: string; district: string; state: string }>();
  if (marketIds?.length) {
    const { items } = await listMarkets({ district, state, mode, limit: 200 });
    for (const market of items) {
      marketInfo.set(String(market._id), {
        name: market.name,
        slug: market.slug,
        district: market.district,
        state: market.state,
      });
    }
  }

  return ok(
    rows.map((row) => ({ ...row, market: marketInfo.get(row.marketId) ?? null })),
    { commodity: { id: String(commodity._id), name: commodity.name, slug: commodity.slug } },
  );
});
