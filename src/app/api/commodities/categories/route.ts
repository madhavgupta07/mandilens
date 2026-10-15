import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { listCommodityCategories } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const categories = await listCommodityCategories("all");
  return ok({ categories });
});
