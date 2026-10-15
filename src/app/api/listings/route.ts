import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, created, parsePagination, paginationMeta, ApiError } from "@/lib/api/response";
import { listingCreateSchema, listingQuerySchema } from "@/lib/validation/listing";
import { createListing, listListings } from "@/lib/services/listings";
import { getCurrentUser, requireUser } from "@/lib/auth/current-user";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const params = request.nextUrl.searchParams;
  const query = listingQuerySchema.parse({
    type: params.get("type") ?? undefined,
    status: params.get("status") ?? undefined,
    commodityId: params.get("commodityId") ?? undefined,
    q: params.get("q") ?? undefined,
    state: params.get("state") ?? undefined,
    district: params.get("district") ?? undefined,
    minQuantity: params.get("minQuantity") ?? undefined,
    maxPrice: params.get("maxPrice") ?? undefined,
    sort: params.get("sort") ?? undefined,
    mode: params.get("mode") ?? undefined,
  });

  const pagination = parsePagination(params, { defaultLimit: 20, maxLimit: 60 });
  const viewer = await getCurrentUser();
  const { items, total } = await listListings(query, pagination, viewer);

  return ok(items, { pagination: paginationMeta(total, pagination) });
});

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();

  const limit = rateLimit({
    key: clientKey(request.headers, "listing-create", user.id),
    limit: 20,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) throw ApiError.tooMany("You have created many listings. Please try again later.");

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = listingCreateSchema.parse(body);
  const listing = await createListing(user.id, input);
  return created(listing);
});
