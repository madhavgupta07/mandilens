"use client";

import * as React from "react";
import { Sparkles, Send, Loader2, Bot, User as UserIcon, Wrench, ShieldCheck, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { cn } from "@/lib/utils/cn";

interface ProviderMeta {
  kind: string;
  name: string;
  model: string;
  isRemote: boolean;
  disclosure: string;
}

interface AiStatus {
  provider: ProviderMeta;
  available: boolean;
  unavailableReason: string | null;
  capabilities: Array<{ name: string; description: string }>;
}

interface ToolTrace {
  name: string;
  arguments: Record<string, unknown>;
  ok: boolean;
  summary: string;
}

interface ChatResponse {
  answer: string;
  mode: "model" | "deterministic";
  provider: ProviderMeta;
  toolTrace: ToolTrace[];
  grounded: boolean;
  missingData: boolean;
  notes: string[];
  conversationId: string | null;
  disclaimer: string;
}

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  meta?: Omit<ChatResponse, "answer" | "conversationId">;
}

const SUGGESTIONS = [
  "Which market pays the most for paddy in Samastipur right now?",
  "Compare wheat prices across markets and subtract ₹1,200 transport for 40 quintals.",
  "Show me how fresh the onion price data is.",
  "Is there a buyer looking for potatoes near me?",
  "What does MandiLens actually do?",
];

export function AiCopilot({ initialQuestion }: { initialQuestion?: string }) {
  const [status, setStatus] = React.useState<AiStatus | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    apiFetch<AiStatus>("/api/ai/status")
      .then((data) => setStatus(data))
      .catch(() => setStatus(null));
  }, []);

  const send = React.useCallback(
    async (question: string) => {
      const trimmed = question.trim();
      if (!trimmed || sending) return;
      setSending(true);
      setInput("");
      const userMessage: Message = {
        id: `u-${Date.now()}`,
        role: "user",
        content: trimmed,
      };
      setMessages((current) => [...current, userMessage]);

      try {
        const history = messages.slice(-8).map((message) => ({
          role: message.role,
          content: message.content,
        }));
        const response = await apiFetch<ChatResponse>("/api/ai/chat", {
          method: "POST",
          json: { message: trimmed, conversationId, history },
        });
        setConversationId(response.conversationId);
        const { answer, conversationId: _omit, ...meta } = response;
        void _omit;
        setMessages((current) => [
          ...current,
          { id: `a-${Date.now()}`, role: "assistant", content: answer, meta },
        ]);
      } catch (error) {
        toast.error(errorMessage(error));
        setMessages((current) => [
          ...current,
          {
            id: `a-${Date.now()}`,
            role: "assistant",
            content: "I couldn't reach the assistant just now. Please try again in a moment.",
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [conversationId, messages, sending],
  );

  const initialised = React.useRef(false);
  React.useEffect(() => {
    if (initialQuestion && !initialised.current) {
      initialised.current = true;
      void send(initialQuestion);
    }
  }, [initialQuestion, send]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px] lg:items-start">
      <Card className="flex h-[70vh] min-h-[520px] flex-col overflow-hidden">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Sparkles className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-semibold">MandiLens Copilot</p>
            <p className="text-xs text-muted-foreground">
              {status?.provider ? status.provider.name : "Checking assistant…"}
            </p>
          </div>
          {status?.provider ? (
            <Badge variant={status.available ? "default" : "outline"}>
              {status.available ? "AI grounded in tools" : "Deterministic mode"}
            </Badge>
          ) : null}
        </div>

        <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-5">
          {messages.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-border bg-muted/40 p-4">
                <p className="text-sm font-medium">Ask a question in plain language.</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  The Copilot only answers using the data it can fetch through validated tools. It
                  runs the calculation engine itself, then explains the result — it never invents
                  prices.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => void send(suggestion)}
                    className="rounded-full border border-border bg-card px-3 py-1.5 text-left text-xs text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((message) => <ChatBubble key={message.id} message={message} />)
          )}

          {sending ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Thinking…
            </div>
          ) : null}
        </div>

        <form
          className="flex items-end gap-2 border-t border-border p-3"
          onSubmit={(event) => {
            event.preventDefault();
            void send(input);
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                void send(input);
              }
            }}
            rows={2}
            placeholder="e.g. Which market gives the best net proceeds for 30 quintals of wheat in Gaya?"
            className="flex-1 resize-none rounded-md border border-input bg-card px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button type="submit" disabled={sending || !input.trim()} className="gap-1.5">
            <Send className="size-4" /> Ask
          </Button>
        </form>
      </Card>

      <div className="space-y-4">
        {status ? (
          <Card>
            <CardContent className="space-y-3 p-5">
              <h3 className="text-sm font-semibold">What I can look up</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                {status.capabilities.map((capability) => (
                  <li key={capability.name} className="flex items-start gap-2">
                    <Wrench className="mt-0.5 size-3.5 shrink-0 text-primary" />
                    {capability.description}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ) : (
          <Skeleton className="h-48" />
        )}

        <Alert variant="warning">
          <ShieldCheck className="size-4" />
          <AlertDescription className="text-xs">
            {status?.provider?.disclosure ??
              "The assistant explains figures produced by MandiLens tools. It is not financial advice."}
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}

function ChatBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground",
        )}
      >
        {isUser ? <UserIcon className="size-4" /> : <Bot className="size-4" />}
      </span>
      <div className={cn("max-w-[85%] space-y-2", isUser && "items-end text-right")}>
        <div
          className={cn(
            "whitespace-pre-wrap rounded-xl px-4 py-2.5 text-sm",
            isUser ? "bg-muted text-foreground" : "border border-border bg-card",
          )}
        >
          {message.content}
        </div>

        {message.meta ? (
          <div className={cn("flex flex-wrap gap-1.5", isUser && "justify-end")}>
            {message.meta.grounded ? (
              <Badge variant="secondary" className="font-normal">
                <ShieldCheck className="size-3" /> Grounded in your data
              </Badge>
            ) : (
              <Badge variant="outline" className="font-normal">
                No data tool used
              </Badge>
            )}
            {message.meta.missingData ? (
              <Badge variant="warning" className="font-normal">
                <TriangleAlert className="size-3" /> Some data missing
              </Badge>
            ) : null}
            <Badge variant="outline" className="font-normal capitalize">
              {message.meta.mode === "model" ? message.meta.provider.model : "deterministic"}
            </Badge>
          </div>
        ) : null}

        {message.meta && message.meta.toolTrace.length > 0 ? (
          <details className="text-left">
            <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
              {message.meta.toolTrace.length} data tool
              {message.meta.toolTrace.length === 1 ? "" : "s"} used
            </summary>
            <div className="mt-2 space-y-1.5">
              {message.meta.toolTrace.map((trace, index) => (
                <div
                  key={index}
                  className="rounded-md border border-border bg-muted/40 px-2.5 py-1.5 text-xs"
                >
                  <p className="font-mono text-[11px] text-primary">{trace.name}</p>
                  <p className="text-muted-foreground">{trace.summary}</p>
                </div>
              ))}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}
