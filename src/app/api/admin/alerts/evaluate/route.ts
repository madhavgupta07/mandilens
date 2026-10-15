import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireAdmin, getCurrentUser, isAdmin } from "@/lib/auth/current-user";
import { evaluateAlerts } from "@/lib/services/alerts";
import { expireListings } from "@/lib/services/listings";
import { recordAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ userId: z.string().optional() });

function authorizedByCron(request: NextRequest): boolean {
  const secret = process.env.INGESTION_CRON_SECRET;
  if (!secret) return false;
  return request.headers.get("x-cron-secret") === secret;
}

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const cron = authorizedByCron(request);
  if (!cron) await requireAdmin();

  const body = await request.json().catch(() => ({}));
  const { userId } = bodySchema.parse(body ?? {});

  const [evaluation, expired] = await Promise.all([
    evaluateAlerts(userId ? { userId } : {}),
    expireListings(),
  ]);

  const user = await getCurrentUser();
  await recordAudit({
    actor: isAdmin(user) ? user : null,
    actorLabel: cron ? "cron" : user?.email,
    action: "alerts.evaluated",
    meta: { triggered: evaluation.triggered, expiredListings: expired },
    request,
  });

  return ok({ ...evaluation, expiredListings: expired });
});
