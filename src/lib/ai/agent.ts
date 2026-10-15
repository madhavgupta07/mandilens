import { getMaxToolSteps, getRequestTimeoutMs } from "@/lib/ai/config";
import { buildSystemPrompt } from "@/lib/ai/prompts";
import { TOOL_DEFINITIONS, getTool } from "@/lib/ai/tools";
import type { AuthUser } from "@/lib/auth/current-user";
import type { ChatMessage, ModelProvider } from "@/lib/ai/types";
import { runDeterministicAssistant } from "@/lib/ai/deterministic";

export interface AssistantToolTrace {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  summary: string;
}

export interface AssistantTurn {
  role: "user" | "assistant";
  content: string;
}

export interface AssistantResult {
  answer: string;
  mode: "model" | "deterministic";
  provider: {
    kind: string;
    name: string;
    model: string;
    isRemote: boolean;
    disclosure: string;
  };
  toolTrace: AssistantToolTrace[];
  grounded: boolean;
  missingData: boolean;
  notes: string[];
}

interface RunAssistantParams {
  question: string;
  history?: AssistantTurn[];
  user: AuthUser | null;
  now?: Date;
  provider: ModelProvider | null;
  providerMeta: AssistantResult["provider"];
  unavailableReason?: string;
}

function toolMessageContent(data: unknown): string {
  try {
    const json = JSON.stringify(data);
    return json.length > 8000 ? `${json.slice(0, 8000)}…[truncated]` : json;
  } catch {
    return String(data);
  }
}

/**
 * The agent loop. The model may only ask for data through validated tools; the
 * application executes them and the model explains the result. The model never
 * computes financial figures itself.
 */
export async function runAssistant(params: RunAssistantParams): Promise<AssistantResult> {
  const now = params.now ?? new Date();

  // No usable model -> deterministic, clearly-labelled behaviour.
  if (!params.provider) {
    const deterministic = await runDeterministicAssistant({
      question: params.question,
      user: params.user,
      now,
    });
    return {
      ...deterministic,
      provider: params.providerMeta,
      notes: [params.unavailableReason, ...deterministic.notes].filter(Boolean) as string[],
    };
  }

  const provider = params.provider;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), getRequestTimeoutMs());

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: buildSystemPrompt({
        today: now,
        providerDisclosure: params.providerMeta.disclosure,
      }),
    },
    ...(params.history ?? []).map<ChatMessage>((turn) => ({
      role: turn.role,
      content: turn.content,
    })),
    { role: "user", content: params.question },
  ];

  const toolTrace: AssistantToolTrace[] = [];
  const notes: string[] = [];
  let missingData = false;

  try {
    for (let step = 0; step < getMaxToolSteps(); step += 1) {
      const response = await provider.chat({
        messages,
        tools: TOOL_DEFINITIONS,
        signal: controller.signal,
      });

      if (!response.toolCalls.length) {
        const answer = response.content?.trim();
        if (answer) {
          return {
            answer,
            mode: "model",
            provider: params.providerMeta,
            toolTrace,
            grounded: toolTrace.length > 0,
            missingData,
            notes,
          };
        }
        break; // empty response -> fall through to summary below
      }

      messages.push({
        role: "assistant",
        content: response.content ?? "",
        toolCalls: response.toolCalls,
      });

      for (const call of response.toolCalls) {
        const tool = getTool(call.name);
        if (!tool) {
          messages.push({
            role: "tool",
            toolCallId: call.id,
            name: call.name,
            content: JSON.stringify({
              error: `Unknown tool "${call.name}". Use only the provided tools.`,
            }),
          });
          toolTrace.push({
            name: call.name,
            arguments: call.arguments,
            ok: false,
            summary: "Unknown tool requested by the model.",
          });
          continue;
        }

        try {
          const result = await tool.execute(call.arguments, {
            user: params.user,
            now,
          });
          if (typeof result.summary === "string" && /no .*(data|price|listing|records|match)/i.test(result.summary)) {
            missingData = true;
          }
          toolTrace.push({
            name: call.name,
            arguments: call.arguments,
            ok: true,
            summary: result.summary,
          });
          messages.push({
            role: "tool",
            toolCallId: call.id,
            name: call.name,
            content: toolMessageContent({ summary: result.summary, data: result.data }),
          });
        } catch (error) {
          const message = error instanceof Error ? error.message : "Tool failed.";
          toolTrace.push({
            name: call.name,
            arguments: call.arguments,
            ok: false,
            summary: `Tool failed: ${message}`,
          });
          messages.push({
            role: "tool",
            toolCallId: call.id,
            name: call.name,
            content: JSON.stringify({ error: message }),
          });
        }
      }
    }

    // Ran out of steps or the model returned nothing: summarise what we actually
    // retrieved rather than inventing a conclusion.
    const lastSuccessful = [...toolTrace].reverse().find((trace) => trace.ok);
    const fallbackAnswer = lastSuccessful
      ? `Here is what the available data shows: ${lastSuccessful.summary}`
      : "I could not retrieve any data for that question. Please check the commodity and location, or import the relevant market data first.";

    notes.push("The model did not produce a final summary; a tool-based summary is shown instead.");
    return {
      answer: fallbackAnswer,
      mode: "model",
      provider: params.providerMeta,
      toolTrace,
      grounded: toolTrace.length > 0,
      missingData,
      notes,
    };
  } finally {
    clearTimeout(timeout);
  }
}
