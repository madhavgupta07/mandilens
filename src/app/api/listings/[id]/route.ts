import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { isAdmin } from "@/lib/auth/current-user";
import { getListingById, updateListing } from "@/lib/services/listings";
import { listingUpdateSchema } from "@/lib/validation/listing";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_request, context) => {
  const { id } = await context.params;
  const viewer = await getCurrentUser();
  const listing = await getListingById(
    id,
    viewer ? { id: viewer.id, isAdmin: isAdmin(viewer) } : null,
  );
  if (!listing) throw ApiError.notFound("Listing not found.");
  return ok(listing);
});

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const { id } = await context.params;
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw ApiError.badRequest("Request body must be valid JSON.");
    });
    const input = listingUpdateSchema.parse(body);
    const listing = await updateListing({ id: user.id, isAdmin: isAdmin(user) }, id, input);
    return ok(listing);
  },
);
