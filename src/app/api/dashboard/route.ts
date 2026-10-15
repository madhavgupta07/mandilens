import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { getDashboardSummary } from "@/lib/services/dashboard";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await requireUser();
  const summary = await getDashboardSummary(user.id);
  return ok(summary);
});
