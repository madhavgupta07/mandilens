import { withApi } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getProvider } from "@/lib/ai/providers";
import { toProviderMeta } from "@/lib/ai/provider-meta";
import { TOOL_DEFINITIONS } from "@/lib/ai/tools";

export const dynamic = "force-dynamic";

export const GET = withApi(async () => {
  const { provider, config, unavailableReason } = await getProvider();
  return ok({
    provider: toProviderMeta(config),
    available: Boolean(provider),
    unavailableReason: unavailableReason ?? null,
    capabilities: TOOL_DEFINITIONS.map((tool) => ({
      name: tool.name,
      description: tool.description,
    })),
  });
});
