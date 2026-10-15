import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { requireAdmin } from "@/lib/auth/current-user";
import { connectToDatabase } from "@/lib/db/connect";
import { DataSource } from "@/lib/db/models";
import { syncDataSourceRegistry } from "@/lib/services/ingestion";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  await requireAdmin();
  await syncDataSourceRegistry();
  await connectToDatabase();
  const sources = await DataSource.find().sort({ key: 1 }).lean();
  return ok(
    sources.map((source) => ({
      key: source.key,
      name: source.name,
      type: source.type,
      url: source.url,
      license: source.license,
      attribution: source.attribution,
      updateFrequency: source.updateFrequency,
      requiresApiKey: source.requiresApiKey,
      apiKeyEnvVar: source.apiKeyEnvVar,
      isEnabled: source.isEnabled,
      configured: source.requiresApiKey
        ? Boolean(source.apiKeyEnvVar && process.env[source.apiKeyEnvVar])
        : true,
      lastRunAt: source.lastRunAt,
      lastStatus: source.lastStatus,
      lastError: source.lastError,
      lastRecordCount: source.lastRecordCount,
    })),
  );
});
