import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { autoCompareSchema } from "@/lib/validation/compare";
import { runAutoComparison } from "@/lib/services/comparison";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const limit = rateLimit({
    key: clientKey(request.headers, "compare-auto"),
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) throw ApiError.tooMany("Too many comparisons. Please slow down.");

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = autoCompareSchema.parse(body);
  const output = await runAutoComparison(input);

  return ok(output);
});
