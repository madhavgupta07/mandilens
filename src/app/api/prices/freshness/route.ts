import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { getCommodityById, getCommodityBySlug, findCommodityByName, listMarkets } from "@/lib/services/catalog";
import { getFreshnessSummary } from "@/lib/services/prices";
import type { DataMode } from "@/lib/domain/constants";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const mode = (params.get("mode") as DataMode | "all" | null) ?? "all";

  const commodity =
    (params.get("commodityId") ? await getCommodityById(params.get("commodityId")!) : null) ??
    (params.get("commoditySlug") ? await getCommodityBySlug(params.get("commoditySlug")!) : null) ??
    (params.get("commodity") ? await findCommodityByName(params.get("commodity")!, mode) : null);
  if (!commodity) throw ApiError.badRequest("Provide a valid commodity.");

  const district = params.get("district") ?? undefined;
  const state = params.get("state") ?? undefined;
  let marketIds: string[] | undefined;
  if (district || state) {
    const { items } = await listMarkets({ district, state, mode, limit: 200 });
    marketIds = items.map((market) => String(market._id));
  }

  const summary = await getFreshnessSummary({
    commodityId: String(commodity._id),
    marketIds,
    mode,
  });

  return ok(summary);
});
