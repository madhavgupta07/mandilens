import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { forgotPasswordSchema } from "@/lib/validation/auth";
import { initiatePasswordReset } from "@/lib/services/auth";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const limit = rateLimit({
    key: clientKey(request.headers, "forgot-password"),
    limit: 5,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) {
    throw ApiError.tooMany("Too many reset requests. Please try again later.");
  }

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const { email } = forgotPasswordSchema.parse(body);

  const result = await initiatePasswordReset(email);
  return ok(result);
});
