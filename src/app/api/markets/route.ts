import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, parsePagination, paginationMeta } from "@/lib/api/response";
import { listMarkets } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const pagination = parsePagination(params, { defaultLimit: 50, maxLimit: 100 });

  const { items, total } = await listMarkets({
    q: params.get("q") ?? undefined,
    state: params.get("state") ?? undefined,
    district: params.get("district") ?? undefined,
    mode: (params.get("mode") as "real" | "demo" | "all" | null) ?? "all",
    limit: pagination.limit,
    skip: pagination.skip,
  });

  return ok(
    items.map((market) => ({
      id: String(market._id),
      name: market.name,
      slug: market.slug,
      state: market.state,
      district: market.district,
      block: market.block,
      marketType: market.marketType,
      isDemo: market.isDemo,
    })),
    { pagination: paginationMeta(total, pagination) },
  );
});
