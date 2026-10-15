/**
 * Provider-agnostic chat types. Model-specific code lives only inside
 * `src/lib/ai/providers/*` and never leaks into business logic.
 */

export type ChatRole = "system" | "user" | "assistant" | "tool";

export interface ChatMessage {
  role: ChatRole;
  content: string;
  /** Set on `tool` messages so the model can associate results with calls. */
  toolCallId?: string;
  name?: string;
  /** Set on assistant messages that requested tools. */
  toolCalls?: ToolCall[];
}

export interface JsonSchemaObject {
  type: "object";
  properties: Record<string, unknown>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: JsonSchemaObject;
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface ModelUsage {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
}

export interface ModelResponse {
  content: string;
  toolCalls: ToolCall[];
  usage?: ModelUsage;
  finishReason?: string;
}

export interface ChatParams {
  messages: ChatMessage[];
  tools: ToolDefinition[];
  temperature?: number;
  maxTokens?: number;
  signal?: AbortSignal;
}

/**
 * Every model backend (remote OpenAI-compatible, local Ollama, or the
 * deterministic fallback) implements this interface.
 */
export interface ModelProvider {
  readonly kind: "gemma" | "openai" | "ollama" | "deterministic";
  readonly name: string;
  readonly model: string;
  /** Whether prompts leave the machine. Used to disclose remote inference. */
  readonly isRemote: boolean;
  isAvailable(): Promise<boolean>;
  chat(params: ChatParams): Promise<ModelResponse>;
}
