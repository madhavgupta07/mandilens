import type { AiConfig } from "@/lib/ai/config";

export interface ProviderMeta {
  kind: string;
  name: string;
  model: string;
  isRemote: boolean;
  disclosure: string;
}

/** Human-readable label for the resolved provider, safe to show in the UI. */
export function providerName(config: AiConfig): string {
  switch (config.provider) {
    case "gemma":
      return "Google AI Studio (Gemma, open weights)";
    case "openai":
      return "OpenAI-compatible endpoint";
    case "ollama":
      return "Ollama (local model)";
    case "deterministic":
    default:
      return "Deterministic mode (no language model)";
  }
}

export function toProviderMeta(config: AiConfig): ProviderMeta {
  return {
    kind: config.provider,
    name: providerName(config),
    model: config.model,
    isRemote: config.isRemote,
    disclosure: config.disclosure,
  };
}
