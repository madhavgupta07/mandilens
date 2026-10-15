import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { reportListing } from "@/lib/services/listings";
import { listingReportSchema } from "@/lib/validation/listing";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";

export const POST = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const { id } = await context.params;
    const user = await requireUser();

    const limit = rateLimit({
      key: clientKey(request.headers, "listing-report", user.id),
      limit: 10,
      windowMs: 60 * 60 * 1000,
    });
    if (!limit.allowed) throw ApiError.tooMany("Too many reports submitted. Please try again later.");

    const body = await request.json().catch(() => {
      throw ApiError.badRequest("Request body must be valid JSON.");
    });
    const { reason } = listingReportSchema.parse(body);
    const result = await reportListing(user.id, id, reason);
    return ok(result);
  },
);
