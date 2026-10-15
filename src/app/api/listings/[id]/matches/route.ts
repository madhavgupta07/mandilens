import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getCurrentUser } from "@/lib/auth/current-user";
import { findMatches } from "@/lib/services/listings";

export const dynamic = "force-dynamic";

export const GET = withApi<{ params: Promise<{ id: string }> }>(async (_request, context) => {
  const { id } = await context.params;
  const viewer = await getCurrentUser();
  const { source, matches } = await findMatches(id, { viewerId: viewer?.id });
  return ok({ source, matches });
});
