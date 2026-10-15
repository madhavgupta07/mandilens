import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireUser } from "@/lib/auth/current-user";
import { listNotifications, markNotificationsRead } from "@/lib/services/notifications";
import { z } from "zod";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  const user = await requireUser();
  const unreadOnly = request.nextUrl.searchParams.get("unread") === "true";
  const limit = Number.parseInt(request.nextUrl.searchParams.get("limit") ?? "30", 10);
  const result = await listNotifications(user.id, { unreadOnly, limit });
  return ok(result);
});

const readSchema = z.object({ ids: z.array(z.string()).max(200).optional() });

export const POST = withApi(async (request: NextRequest) => {
  const user = await requireUser();
  const body = await request.json().catch(() => ({}));
  const { ids } = readSchema.parse(body ?? {});
  const updated = await markNotificationsRead(user.id, ids);
  return ok({ updated });
});
