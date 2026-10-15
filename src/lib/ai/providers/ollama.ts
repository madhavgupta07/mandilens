import { resolveAiConfig, getRequestTimeoutMs } from "@/lib/ai/config";
import type {
  ChatParams,
  ModelProvider,
  ModelResponse,
  ToolCall,
} from "@/lib/ai/types";

/**
 * Local inference through Ollama's /api/chat endpoint (native tool calling).
 * Ollama serves open-weight models on the developer's own machine, so prompts
 * never leave the host.
 */
export function createOllamaProvider(): ModelProvider {
  const config = resolveAiConfig();
  const baseUrl = config.baseUrl ?? "http://127.0.0.1:11434";
  const model = config.model;

  return {
    kind: "ollama",
    name: "Ollama (local open-weight model)",
    model,
    isRemote: false,
    async isAvailable() {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 1500);
      try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/tags`, {
          signal: controller.signal,
        });
        if (!response.ok) return false;
        const json = (await response.json()) as { models?: Array<{ name?: string }> };
        return Boolean(
          json.models?.some((entry) => entry.name && entry.name.startsWith(model.split(":")[0])),
        );
      } catch {
        return false;
      } finally {
        clearTimeout(timeout);
      }
    },
    async chat(params: ChatParams): Promise<ModelResponse> {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());
      try {
        const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/api/chat`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            model,
            stream: false,
            options: { temperature: params.temperature ?? 0.2 },
            tools: params.tools.map((tool) => ({
              type: "function",
              function: {
                name: tool.name,
                description: tool.description,
                parameters: tool.parameters,
              },
            })),
            messages: params.messages.map((message) => ({
              role: message.role === "tool" ? "tool" : message.role,
              content: message.content,
              ...(message.role === "assistant" && message.toolCalls?.length
                ? {
                    tool_calls: message.toolCalls.map((call) => ({
                      function: {
                        name: call.name,
                        arguments: call.arguments ?? {},
                      },
                    })),
                  }
                : {}),
            })),
          }),
          signal: params.signal ?? controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Ollama returned ${response.status}.`);
        }

        const json = (await response.json()) as {
          message?: {
            content?: string;
            tool_calls?: Array<{
              function?: { name?: string; arguments?: unknown };
            }>;
          };
          prompt_eval_count?: number;
          eval_count?: number;
        };

        const toolCalls: ToolCall[] = (json.message?.tool_calls ?? []).map(
          (call, index) => ({
            id: `call_${index}`,
            name: call.function?.name ?? "unknown",
            arguments:
              call.function?.arguments && typeof call.function.arguments === "object"
                ? (call.function.arguments as Record<string, unknown>)
                : typeof call.function?.arguments === "string"
                  ? safeParse(call.function.arguments)
                  : {},
          }),
        );

        return {
          content: json.message?.content ?? "",
          toolCalls,
          usage: {
            promptTokens: json.prompt_eval_count,
            completionTokens: json.eval_count,
          },
        };
      } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
          throw new Error("The local model request timed out.");
        }
        throw error;
      } finally {
        clearTimeout(timeout);
      }
    },
  };
}

function safeParse(value: string): Record<string, unknown> {
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
