import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, created, ApiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { createAlert, listAlerts } from "@/lib/services/alerts";
import { alertCreateSchema } from "@/lib/validation/listing";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await requireUser();
  const items = await listAlerts(user.id);
  return ok(items);
});

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();

  const limit = rateLimit({
    key: clientKey(request.headers, "alert-create", user.id),
    limit: 25,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) throw ApiError.tooMany("You have created many alerts. Please try again later.");

  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = alertCreateSchema.parse(body);
  const alert = await createAlert(user.id, input);
  return created(alert);
});
