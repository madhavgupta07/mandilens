import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { updateWatchlist, deleteWatchlist } from "@/lib/services/watchlists";
import { watchlistCreateSchema } from "@/lib/validation/listing";

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const { id } = await context.params;
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw ApiError.badRequest("Request body must be valid JSON.");
    });
    const input = watchlistCreateSchema.partial().parse(body);
    const watchlist = await updateWatchlist(user.id, id, input);
    return ok(watchlist);
  },
);

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (request, context) => {
  assertSameOrigin(request);
  const { id } = await context.params;
  const user = await requireUser();
  const result = await deleteWatchlist(user.id, id);
  return ok(result);
});
