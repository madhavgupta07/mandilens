import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { endSession } from "@/lib/auth/session-cookie";

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  await endSession();
  return ok({ signedOut: true });
});
