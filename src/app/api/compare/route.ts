import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { compareInputSchema } from "@/lib/validation/compare";
import { runComparison } from "@/lib/services/comparison";
import { getCurrentUser } from "@/lib/auth/current-user";
import { saveComparison } from "@/lib/services/watchlists";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";
import { ApiError } from "@/lib/api/response";

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const limit = rateLimit({
    key: clientKey(request.headers, "compare"),
    limit: 60,
    windowMs: 10 * 60 * 1000,
  });
  if (!limit.allowed) throw ApiError.tooMany("Too many comparisons. Please slow down.");

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = compareInputSchema.parse(body);
  const output = await runComparison(input);

  const user = await getCurrentUser();
  let savedId: string | null = null;
  if (user && typeof body.saveAs === "string" && body.saveAs.trim().length >= 2) {
    const saved = await saveComparison(user.id, {
      title: body.saveAs.trim().slice(0, 200),
      input: input as unknown as Record<string, unknown>,
      result: output as unknown as Record<string, unknown>,
    });
    savedId = String((saved as Record<string, unknown>)._id ?? "") || null;
  }

  return ok({ ...output, savedId });
});
