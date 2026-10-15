import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { resetPassword, changePassword } from "@/lib/services/auth";
import { requireUser } from "@/lib/auth/current-user";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";
import { recordAudit } from "@/lib/services/audit";

const resetSchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8).max(200),
});

const changeSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  password: z.string().min(8).max(200),
});

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const limit = rateLimit({
    key: clientKey(request.headers, "reset-password"),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) throw ApiError.tooMany("Too many attempts. Please try again later.");

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });

  const change = changeSchema.safeParse(body);
  if (change.success) {
    const user = await requireUser();
    await changePassword(user.id, change.data.currentPassword, change.data.password);
    await recordAudit({
      actor: user,
      action: "user.password_changed",
      entityType: "User",
      entityId: user.id,
      request,
    });
    return ok({ changed: true });
  }

  const { token, password } = resetSchema.parse(body);
  await resetPassword(token, password);
  return ok({ reset: true });
});
