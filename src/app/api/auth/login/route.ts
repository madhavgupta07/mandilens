import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { loginSchema } from "@/lib/validation/auth";
import { authenticate } from "@/lib/services/auth";
import { startSession } from "@/lib/auth/session-cookie";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";
import { recordAudit } from "@/lib/services/audit";

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = loginSchema.parse(body);

  const limit = rateLimit({
    key: clientKey(request.headers, "login", input.email.toLowerCase()),
    limit: 15,
    windowMs: 15 * 60 * 1000,
  });
  if (!limit.allowed) {
    throw ApiError.tooMany("Too many sign-in attempts. Please wait a few minutes.");
  }

  const user = await authenticate(input.email, input.password);
  await startSession(user);
  await recordAudit({
    actor: user,
    action: "user.login",
    entityType: "User",
    entityId: user.id,
    request,
  });

  return ok({ user });
});
