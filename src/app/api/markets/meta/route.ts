import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { listMarketStates, listMarketDistricts } from "@/lib/services/catalog";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const [states, districts] = await Promise.all([
    listMarketStates("all"),
    listMarketDistricts(undefined, "all"),
  ]);
  return ok({ states, districts });
});
