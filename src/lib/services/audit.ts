import { connectToDatabase } from "@/lib/db/connect";
import { AuditLog } from "@/lib/db/models";
import type { AuthUser } from "@/lib/auth/current-user";

export interface AuditInput {
  actor?: AuthUser | null;
  actorLabel?: string;
  action: string;
  entityType?: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  request?: Request;
}

/**
 * Append-only record of administrative and security-relevant actions.
 * Failures to write an audit entry are logged but never break the request.
 */
export async function recordAudit(input: AuditInput): Promise<void> {
  try {
    await connectToDatabase();
    const headers = input.request?.headers;
    await AuditLog.create({
      actor: input.actor?.id,
      actorLabel: input.actor?.email ?? input.actorLabel ?? "system",
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId,
      meta: input.meta,
      ip: headers?.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      userAgent: headers?.get("user-agent")?.slice(0, 380) ?? undefined,
    });
  } catch (error) {
    console.error("[audit] failed to write audit entry:", error);
  }
}
