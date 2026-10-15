import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireUser, isAdmin } from "@/lib/auth/current-user";
import { changeListingStatus } from "@/lib/services/listings";
import { listingStatusActionSchema } from "@/lib/validation/listing";

export const POST = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const { id } = await context.params;
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw ApiError.badRequest("Request body must be valid JSON.");
    });
    const { action } = listingStatusActionSchema.parse(body);
    const listing = await changeListingStatus({ id: user.id, isAdmin: isAdmin(user) }, id, action);
    return ok(listing);
  },
);
