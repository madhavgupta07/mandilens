/**
 * Model configuration resolution and validation.
 *
 * Nothing here performs inference. It only decides *which* open model backend
 * to use and reports problems clearly, so that a missing key degrades to the
 * deterministic fallback instead of breaking the product.
 */

export type ProviderKind = "gemma" | "openai" | "ollama" | "deterministic";

export interface AiConfig {
  /** Provider that will actually be attempted (`deterministic` when none works). */
  provider: ProviderKind;
  /** What the operator asked for via AI_PROVIDER. */
  requested: string;
  baseUrl: string | null;
  apiKey: string | null;
  model: string;
  isRemote: boolean;
  issues: string[];
  disclosure: string;
}

const GOOGLE_OPENAI_BASE = "https://generativelanguage.googleapis.com/v1beta/openai";

export function resolveAiConfig(env: NodeJS.ProcessEnv = process.env): AiConfig {
  const requested = (env.AI_PROVIDER || "auto").toLowerCase();
  const apiKey = env.OPEN_MODEL_API_KEY?.trim() || null;
  const baseUrl = env.OPEN_MODEL_BASE_URL?.trim() || null;
  const model = env.OPEN_MODEL_MODEL?.trim() || "gemma-3-12b-it";
  const ollamaBase = env.OLLAMA_BASE_URL?.trim() || "http://127.0.0.1:11434";
  const ollamaModel = env.OLLAMA_MODEL?.trim() || "gemma3:4b";

  const issues: string[] = [];

  const remote = (kind: "gemma" | "openai", url: string, m: string): AiConfig => ({
    provider: kind,
    requested,
    baseUrl: url,
    apiKey,
    model: m,
    isRemote: true,
    issues,
    disclosure:
      "Requests are sent to a third-party inference endpoint. Do not paste sensitive personal data into the assistant.",
  });

  const local = (): AiConfig => ({
    provider: "ollama",
    requested,
    baseUrl: ollamaBase,
    apiKey: null,
    model: ollamaModel,
    isRemote: false,
    issues,
    disclosure:
      "Inference runs locally through Ollama on this machine. No prompt data is sent to a third party.",
  });

  const deterministic = (): AiConfig => ({
    provider: "deterministic",
    requested,
    baseUrl: null,
    apiKey: null,
    model: "rule-based (no model configured)",
    isRemote: false,
    issues,
    disclosure:
      "No language model is configured, so the assistant runs in clearly-labelled deterministic mode. It still retrieves real data and performs all calculations.",
  });

  switch (requested) {
    case "none":
    case "deterministic":
      return deterministic();
    case "gemma":
      if (!apiKey) issues.push("OPEN_MODEL_API_KEY is not set for the Gemma provider.");
      return remote("gemma", baseUrl || GOOGLE_OPENAI_BASE, model);
    case "openai":
      if (!apiKey) issues.push("OPEN_MODEL_API_KEY is not set for the OpenAI-compatible provider.");
      if (!baseUrl) issues.push("OPEN_MODEL_BASE_URL is not set for the OpenAI-compatible provider.");
      return remote("openai", baseUrl || GOOGLE_OPENAI_BASE, model);
    case "ollama":
      return local();
    case "auto":
    default:
      if (apiKey && baseUrl) {
        return remote(
          baseUrl.includes("generativelanguage") ? "gemma" : "openai",
          baseUrl,
          model,
        );
      }
      if (apiKey && baseUrl === null) {
        // Key present but no explicit base URL: assume Google AI Studio (Gemma).
        return remote("gemma", GOOGLE_OPENAI_BASE, model);
      }
      issues.push(
        "No OPEN_MODEL_API_KEY supplied; will try local Ollama, then the deterministic fallback.",
      );
      return local();
  }
}

export function getRequestTimeoutMs(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.AI_REQUEST_TIMEOUT_MS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 45_000;
}

export function getMaxToolSteps(env: NodeJS.ProcessEnv = process.env): number {
  const parsed = Number.parseInt(env.AI_MAX_TOOL_STEPS ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? Math.min(parsed, 12) : 6;
}
