import { resolveAiConfig, getRequestTimeoutMs } from "@/lib/ai/config";
import type {
  ChatParams,
  ModelProvider,
  ModelResponse,
  ToolCall,
  ChatMessage,
} from "@/lib/ai/types";

/**
 * Works with any OpenAI-compatible chat-completions endpoint that supports
 * tool calling, including:
 *   - Google AI Studio (Gemma open-weight models)
 *   - Groq, OpenRouter, Together, DigitalOcean Gradient, vLLM, LM Studio ...
 */
export function createOpenAiCompatibleProvider(): ModelProvider {
  const config = resolveAiConfig();

  const callModel = async (params: ChatParams, attempt = 1): Promise<ModelResponse> => {
    if (!config.apiKey || !config.baseUrl) {
      throw new Error("OpenAI-compatible provider is not fully configured.");
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());
    const signal = params.signal ?? controller.signal;

    const body = {
      model: config.model,
      messages: params.messages.map(toWireMessage),
      temperature: params.temperature ?? 0.2,
      max_tokens: params.maxTokens ?? 900,
      tools: params.tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters,
        },
      })),
      tool_choice: params.tools.length ? "auto" : undefined,
    };

    try {
      const response = await fetch(`${trimSlash(config.baseUrl)}/chat/completions`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.apiKey}`,
        },
        body: JSON.stringify(body),
        signal,
      });

      if (!response.ok) {
        const text = await safeText(response);
        // Retry once on transient server errors.
        if (response.status >= 500 && attempt < 2) {
          return callModel(params, attempt + 1);
        }
        throw new Error(
          `Model endpoint returned ${response.status}. ${text.slice(0, 300)}`,
        );
      }

      const json = (await response.json()) as OpenAiChatResponse;
      const choice = json.choices?.[0];
      const message = choice?.message;

      const toolCalls: ToolCall[] = (message?.tool_calls ?? []).map((call, index) => ({
        id: call.id || `call_${index}`,
        name: call.function?.name ?? "unknown",
        arguments: parseArguments(call.function?.arguments),
      }));

      return {
        content: message?.content ?? "",
        toolCalls,
        usage: {
          promptTokens: json.usage?.prompt_tokens,
          completionTokens: json.usage?.completion_tokens,
          totalTokens: json.usage?.total_tokens,
        },
        finishReason: choice?.finish_reason,
      };
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        throw new Error("The model request timed out.");
      }
      if (attempt < 2 && isTransient(error)) {
        return callModel(params, attempt + 1);
      }
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    kind: config.provider === "gemma" ? "gemma" : "openai",
    name:
      config.provider === "gemma"
        ? "Google AI Studio (Gemma, open weights)"
        : "OpenAI-compatible open-weight endpoint",
    model: config.model,
    isRemote: true,
    async isAvailable() {
      return Boolean(config.apiKey && config.baseUrl);
    },
    chat: callModel,
  };
}

interface OpenAiChatResponse {
  choices?: Array<{
    message?: {
      content?: string | null;
      tool_calls?: Array<{
        id?: string;
        function?: { name?: string; arguments?: string };
      }>;
    };
    finish_reason?: string;
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

function toWireMessage(message: ChatMessage) {
  if (message.role === "tool") {
    return {
      role: "tool",
      content: message.content,
      tool_call_id: message.toolCallId,
    };
  }
  if (message.role === "assistant" && message.toolCalls?.length) {
    return {
      role: "assistant",
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: "function",
        function: {
          name: call.name,
          arguments: JSON.stringify(call.arguments ?? {}),
        },
      })),
    };
  }
  return { role: message.role, content: message.content };
}

function parseArguments(raw: unknown): Record<string, unknown> {
  if (typeof raw !== "string") return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

async function safeText(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

function isTransient(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /timed out|ECONNRESET|network|fetch failed|socket/i.test(message);
}
