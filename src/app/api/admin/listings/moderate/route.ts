import type { NextRequest } from "next/server";
import { z } from "zod";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, parsePagination, paginationMeta, ApiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import { Listing } from "@/lib/db/models";
import { recordAudit } from "@/lib/services/audit";

export const dynamic = "force-dynamic";

const moderationSchema = z.object({ action: z.enum(["remove", "restore"]) });

export const GET = withApi(async (request: NextRequest) => {
  await requireAdmin();
  await connectToDatabase();
  const pagination = parsePagination(request.nextUrl.searchParams, { defaultLimit: 20, maxLimit: 100 });
  const filter = { moderationStatus: "reported" as const };
  const [items, total] = await Promise.all([
    Listing.find(filter)
      .sort({ updatedAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .populate("user", "name email")
      .lean(),
    Listing.countDocuments(filter),
  ]);
  return ok(
    items.map((listing) => ({
      id: String(listing._id),
      type: listing.type,
      commodityName: listing.commodityName,
      quantity: listing.quantity,
      unit: listing.unit,
      district: listing.district,
      state: listing.state,
      description: listing.description,
      reportCount: listing.reports.length,
      reports: listing.reports.map((report) => ({ reason: report.reason, at: report.at })),
      user: listing.user,
      moderationStatus: listing.moderationStatus,
      status: listing.status,
      createdAt: listing.createdAt,
    })),
    { pagination: paginationMeta(total, pagination) },
  );
});

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);
  const admin = await requireAdmin();
  const body = await request.json().catch(() => {
    throw ApiError.badRequest("Request body must be valid JSON.");
  });
  const { id, action } = z
    .object({ id: z.string().regex(/^[0-9a-fA-F]{24}$/), action: moderationSchema.shape.action })
    .parse(body);

  await connectToDatabase();
  const listing = await Listing.findById(id);
  if (!listing) throw ApiError.notFound("Listing not found.");

  if (action === "remove") {
    listing.moderationStatus = "removed";
    listing.status = "removed";
  } else {
    listing.moderationStatus = "ok";
    if (listing.status === "removed") listing.status = "active";
  }
  await listing.save();

  await recordAudit({
    actor: admin,
    action: `listing.${action}`,
    entityType: "Listing",
    entityId: id,
    request,
  });

  return ok({ id, moderationStatus: listing.moderationStatus, status: listing.status });
});
