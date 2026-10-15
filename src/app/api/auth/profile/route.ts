import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { updateProfileSchema } from "@/lib/validation/auth";
import { updateProfile } from "@/lib/services/auth";
import { requireUser } from "@/lib/auth/current-user";

export const PATCH = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const body = await request.json();
  const input = updateProfileSchema.parse(body);
  const updated = await updateProfile(user.id, input);
  return ok({ user: updated });
});
