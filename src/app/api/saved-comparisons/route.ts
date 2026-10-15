import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, created, ApiError } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { saveComparison, listSavedComparisons } from "@/lib/services/watchlists";
import { savedComparisonSchema } from "@/lib/validation/listing";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const user = await requireUser();
  const items = await listSavedComparisons(user.id);
  return ok(items);
});

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  const user = await requireUser();
  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const input = savedComparisonSchema.parse(body);
  const saved = await saveComparison(user.id, input);
  return created(saved);
});
