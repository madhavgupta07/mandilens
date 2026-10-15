import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { getCommodityById, getCommodityBySlug, findCommodityByName } from "@/lib/services/catalog";
import { getPriceHistory } from "@/lib/services/prices";
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
  if (!commodity) throw ApiError.badRequest("Provide a valid commodity.");

  const days = Math.min(Math.max(Number.parseInt(params.get("days") ?? "30", 10) || 30, 1), 365);

  const points = await getPriceHistory({
    commodityId: String(commodity._id),
    marketId: params.get("marketId") ?? undefined,
    mode,
    sinceDays: days,
    limit: 1000,
  });

  return ok(points, {
    commodity: { id: String(commodity._id), name: commodity.name, slug: commodity.slug },
    days,
  });
});
