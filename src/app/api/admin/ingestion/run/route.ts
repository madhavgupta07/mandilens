import type { NextRequest } from "next/server";
import { withApi, assertSameOrigin } from "@/lib/api/handler";
import { ok, ApiError } from "@/lib/api/response";
import { requireAdmin, getCurrentUser, isAdmin } from "@/lib/auth/current-user";
import { runAgmarknetIngestion, syncDataSourceRegistry } from "@/lib/services/ingestion";
import { createAgmarknetAdapter } from "@/lib/data-sources/agmarknet";
import { recordAudit } from "@/lib/services/audit";
import { rateLimit, clientKey } from "@/lib/auth/rate-limit";
import { z } from "zod";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const runSchema = z.object({
  sourceKey: z.string().default("agmarknet_data_gov_in"),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  commodity: z.string().max(160).optional(),
  maxRecords: z.number().int().min(1).max(20000).optional(),
});

function authorizedByCron(request: NextRequest): boolean {
  const secret = process.env.INGESTION_CRON_SECRET;
  if (!secret) return false;
  const provided = request.headers.get("x-cron-secret");
  return Boolean(provided && provided === secret);
}

export const POST = withApi(async (request: NextRequest) => {
  assertSameOrigin(request);

  const cron = authorizedByCron(request);
  let actorLabel = "cron";
  let actorId: string | undefined;
  if (!cron) {
    const user = await requireAdmin();
    actorLabel = user.email;
    actorId = user.id;
  }

  const limit = rateLimit({
    key: clientKey(request.headers, "ingestion-run", actorId),
    limit: 10,
    windowMs: 60 * 60 * 1000,
  });
  if (!limit.allowed) throw ApiError.tooMany("Ingestion has run too often. Please wait.");

  const body = await request.json().catch(() => ({}));
  const input = runSchema.parse(body ?? {});

  if (input.sourceKey !== "agmarknet_data_gov_in") {
    throw ApiError.badRequest("Only the AGMARKNET source can be run on demand from this endpoint.");
  }

  await syncDataSourceRegistry();
  const summary = await runAgmarknetIngestion(
    {
      state: input.state ?? process.env.AGMARKNET_DEFAULT_STATE ?? undefined,
      district: input.district,
      commodity: input.commodity,
      maxRecords: input.maxRecords,
      importedBy: actorId,
    },
    () => createAgmarknetAdapter(process.env),
  );

  const user = await getCurrentUser();
  await recordAudit({
    actor: isAdmin(user) ? user : null,
    actorLabel,
    action: "ingestion.run",
    entityType: "DataSource",
    entityId: input.sourceKey,
    meta: { ...summary, rejected: undefined },
    request,
  });

  if (summary.status === "failed") {
    throw ApiError.unavailable(summary.error ?? "Ingestion failed.");
  }

  return ok(summary);
});
