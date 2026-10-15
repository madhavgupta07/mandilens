import type { NextRequest } from "next/server";
import { withApi } from "@/lib/api/handler";
import { ok, parsePagination, paginationMeta } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { escapeRegex } from "@/lib/utils/serialize";

export const dynamic = "force-dynamic";

export const GET = withApi(async (request: NextRequest) => {
  await requireAdmin();
  await connectToDatabase();

  const params = request.nextUrl.searchParams;
  const pagination = parsePagination(params, { defaultLimit: 20, maxLimit: 100 });
  const q = params.get("q");
  const filter: Record<string, unknown> = {};
  if (q) {
    const rx = new RegExp(escapeRegex(q.trim()), "i");
    filter.$or = [{ name: rx }, { email: rx }];
  }

  const [items, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip(pagination.skip)
      .limit(pagination.limit)
      .select("name email roles state district isActive isDemo createdAt lastLoginAt")
      .lean(),
    User.countDocuments(filter),
  ]);

  return ok(
    items.map((user) => ({
      id: String(user._id),
      name: user.name,
      email: user.email,
      roles: user.roles,
      state: user.state,
      district: user.district,
      isActive: user.isActive,
      isDemo: user.isDemo,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
    })),
    { pagination: paginationMeta(total, pagination) },
  );
});
