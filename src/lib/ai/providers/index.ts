import { createOllamaProvider } from "./ollama";
import { createOpenAiCompatibleProvider } from "./openai-compatible";
import { resolveAiConfig, type AiConfig } from "@/lib/ai/config";
import type { ModelProvider } from "@/lib/ai/types";

export interface ResolvedProvider {
  provider: ModelProvider | null;
  config: AiConfig;
  /** Reason the model is unavailable, shown in the UI/API response. */
  unavailableReason?: string;
}

/**
 * Choose the best available backend: remote open-weight endpoint, local Ollama,
 * or the deterministic fallback (provider === null).
 */
export async function getProvider(
  env: NodeJS.ProcessEnv = process.env,
): Promise<ResolvedProvider> {
  const config = resolveAiConfig(env);

  if (config.provider === "deterministic") {
    return { provider: null, config, unavailableReason: "No model provider is configured." };
  }

  if (config.provider === "gemma" || config.provider === "openai") {
    if (!config.apiKey) {
      return {
        provider: null,
        config,
        unavailableReason: "The configured model endpoint has no API key, so the deterministic fallback is used.",
      };
    }
    return { provider: createOpenAiCompatibleProvider(), config };
  }

  if (config.provider === "ollama") {
    const ollama = createOllamaProvider();
    const available = await ollama.isAvailable();
    if (!available) {
      return {
        provider: null,
        config,
        unavailableReason:
          "Ollama is configured but not reachable, or the requested model is not installed. Run `ollama pull <model>` and try again.",
      };
    }
    return { provider: ollama, config };
  }

  return { provider: null, config, unavailableReason: "Unknown provider configuration." };
}

export { createOllamaProvider, createOpenAiCompatibleProvider };
