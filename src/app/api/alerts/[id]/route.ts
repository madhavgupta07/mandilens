import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { setAlertActive, deleteAlert } from "@/lib/services/alerts";

const patchSchema = z.object({ isActive: z.boolean() });

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const { id } = await context.params;
    const user = await requireUser();
    const body = await request.json().catch(() => {
      throw ApiError.badRequest("Request body must be valid JSON.");
    });
    const { isActive } = patchSchema.parse(body);
    const alert = await setAlertActive(user.id, id, isActive);
    return ok(alert);
  },
);

export const DELETE = withApi<{ params: Promise<{ id: string }> }>(async (request, context) => {
  assertSameOrigin(request);
  const { id } = await context.params;
  const user = await requireUser();
  const result = await deleteAlert(user.id, id);
  return ok(result);
});
