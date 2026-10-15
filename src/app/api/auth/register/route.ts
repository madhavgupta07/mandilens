import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { created, ApiError } from "@/lib/api/response";
import { registerSchema } from "@/lib/validation/auth";
import { registerUser } from "@/lib/services/auth";
import { startSession } from "@/lib/auth/session-cookie";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";
import { recordAudit } from "@/lib/services/audit";

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const limit = rateLimit({
    key: clientKey(request.headers, "register"),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) throw ApiError.tooMany("Too many sign-up attempts. Try again later.");

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = registerSchema.parse(body);

  const user = await registerUser(input);
  await startSession(user);
  await recordAudit({
    actor: user,
    action: "user.registered",
    entityType: "User",
    entityId: user.id,
    request,
  });

  return created({ user });
});
