import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { adminUserUpdateSchema } from "@/lib/validation/auth";
import { recordAudit } from "@/lib/services/audit";

export const PATCH = withApi<{ params: Promise<{ id: string }> }>(
  async (request: NextRequest, context) => {
    assertSameOrigin(request);
    const admin = await requireAdmin();
    const { id } = await context.params;

    const body = await request.json().catch(() => {
      throw ApiError.badRequest("Request body must be valid JSON.");
    });
    const input = adminUserUpdateSchema.parse(body);

    await connectToDatabase();
    const user = await User.findById(id);
    if (!user) throw ApiError.notFound("User not found.");

    if (input.roles) user.roles = input.roles as typeof user.roles;
    if (input.isActive !== undefined) user.isActive = input.isActive;

    // Never let an administrator remove the last active admin by accident.
    if (user.roles.includes("admin") === false || input.isActive === false) {
      const remainingAdmins = await User.countDocuments({
        _id: { $ne: user._id },
        roles: "admin",
        isActive: true,
      });
      if (remainingAdmins === 0) {
        throw ApiError.conflict("At least one active administrator must remain.");
      }
    }

    await user.save();

    await recordAudit({
      actor: admin,
      action: "user.updated_by_admin",
      entityType: "User",
      entityId: id,
      meta: { roles: user.roles, isActive: user.isActive },
      request,
    });

    return ok({
      id: String(user._id),
      name: user.name,
      email: user.email,
      roles: user.roles,
      isActive: user.isActive,
    });
  },
);
