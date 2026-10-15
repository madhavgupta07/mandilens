import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, parsePagination, paginationMeta } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  await requireAdmin();
  await connectToDatabase();

  const pagination = parsePagination(request.nextUrl.searchParams, { defaultLimit: 30, maxLimit: 100 });
  const [items, total] = await Promise.all([
    AuditLog.find()
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .lean(),
    AuditLog.countDocuments(),
  ]);

  return ok(
    items.map((log) => ({
      id: String(log._id),
      actorLabel: log.actorLabel,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      meta: log.meta,
      ip: log.ip,
      createdAt: log.createdAt,
    })),
    { pagination: paginationMeta(total, pagination) },
  );
});
