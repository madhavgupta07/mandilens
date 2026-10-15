import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { deleteSavedComparison } from "@/lib/services/watchlists";

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (request, context) => {
  assertSameOrigin(request);
  const { id } = await context.params;
  const user = await requireUser();
  const result = await deleteSavedComparison(user.id, id);
  return ok(result);
});
