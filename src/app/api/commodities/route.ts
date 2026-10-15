import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, parsePagination, paginationMeta } from "@/lib/api/response";
import { listCommodities } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const pagination = parsePagination(params, { defaultLimit: 50, maxLimit: 100 });

  const { items, total } = await listCommodities({
    q: params.get("q") ?? undefined,
    category: params.get("category") ?? undefined,
    mode: (params.get("mode") as "real" | "demo" | "all" | null) ?? "all",
    limit: pagination.limit,
    skip: pagination.skip,
  });

  return ok(
    items.map((commodity) => ({
      id: String(commodity._id),
      name: commodity.name,
      slug: commodity.slug,
      hindiName: commodity.hindiName,
      category: commodity.category,
      aliases: commodity.aliases,
      defaultUnit: commodity.defaultUnit,
      isDemo: commodity.isDemo,
    })),
    { pagination: paginationMeta(total, pagination) },
  );
});
