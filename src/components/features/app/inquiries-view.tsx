"use client";

import * as React from "react";
import Link from "next/link";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDate, formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface Populated {
  _id?: string;
  name?: string;
  district?: string;
  state?: string;
  commodityName?: string;
}

interface InquiryListItem {
  _id: string;
  listing?: Populated | null;
  from?: Populated | null;
  to?: Populated | null;
  status: string;
  updatedAt: string;
}

interface InquiryDetail extends InquiryListItem {
  messages: Array<{ _id?: string; sender: string | { _id?: string }; body: string; at: string }>;
}

export function InquiriesView() {
  const { user } = useAuth();
  const [box, setBox] = React.useState<"received" | "sent">("received");
  const [items, setItems] = React.useState<InquiryListItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [active, setActive] = React.useState<InquiryDetail | null>(null);
  const [reply, setReply] = React.useState("");
  const [sending, setSending] = React.useState(false);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<InquiryListItem[]>(`/api/inquiries?box=${box}`);
      setItems(data);
    } catch (err) {
      toast.error(errorMessage(err));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [box]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function openInquiry(id: string) {
    try {
      const detail = await apiFetch<InquiryDetail>(`/api/inquiries/${id}`);
      setActive(detail);
      setReply("");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function sendReply() {
    if (!active || reply.trim().length === 0) return;
    setSending(true);
    try {
      await apiFetch(`/api/inquiries/${active._id}/reply`, {
        method: "POST",
        json: { body: reply.trim() },
      });
      setReply("");
      await openInquiry(active._id);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSending(false);
    }
  }

  function counterpart(item: InquiryListItem | InquiryDetail) {
    const other = box === "received" ? item.from : item.to;
    return other?.name ?? "MandiLens user";
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[340px_1fr] lg:items-start">
      <div className="space-y-4">
        <div className="flex rounded-md border border-border p-0.5">
          {(["received", "sent"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => {
                setBox(option);
                setActive(null);
              }}
              className={cn(
                "flex-1 rounded px-3 py-1.5 text-sm font-medium capitalize transition-colors",
                box === option
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-muted",
              )}
            >
              {option}
            </button>
          ))}
        </div>

        {loading ? (
          <>
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
            <Skeleton className="h-16" />
          </>
        ) : items.length === 0 ? (
          <p className="px-1 text-sm text-muted-foreground">
            No {box} conversations yet.
          </p>
        ) : (
          items.map((item) => (
            <button
              key={item._id}
              type="button"
              onClick={() => void openInquiry(item._id)}
              className={cn(
                "w-full rounded-lg border px-4 py-3 text-left transition-colors",
                active?._id === item._id
                  ? "border-primary bg-primary-muted"
                  : "border-border hover:bg-muted",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium">{item.listing?.commodityName ?? "Listing"}</span>
                <Badge variant="outline" className="capitalize">
                  {item.status}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {counterpart(item)} · {formatDate(item.updatedAt)}
              </p>
            </button>
          ))
        )}
      </div>

      <Card className="min-h-[400px]">
        {!active ? (
          <CardContent className="flex h-full min-h-[400px] items-center justify-center">
            <EmptyState
              icon={MessageSquare}
              title="Select a conversation"
              description="Choose a conversation to read and reply."
            />
          </CardContent>
        ) : (
          <CardContent className="flex h-full flex-col gap-4 p-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <p className="font-semibold">{active.listing?.commodityName ?? "Listing"}</p>
                <p className="text-xs text-muted-foreground">
                  with {counterpart(active)}
                  {active.listing?._id ? (
                    <>
                      {" · "}
                      <Link href={`/listings/${active.listing._id}`} className="underline">
                        view listing
                      </Link>
                    </>
                  ) : null}
                </p>
              </div>
              <Badge variant="outline" className="capitalize">
                {active.status}
              </Badge>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto">
              {active.messages.map((message, index) => {
                const senderId =
                  typeof message.sender === "string" ? message.sender : message.sender?._id;
                const mine = senderId === user?.id;
                return (
                  <div key={message._id ?? index} className={cn("flex", mine && "justify-end")}>
                    <div
                      className={cn(
                        "max-w-[80%] rounded-xl px-3.5 py-2 text-sm",
                        mine ? "bg-primary text-primary-foreground" : "border border-border bg-muted/50",
                      )}
                    >
                      <p className="whitespace-pre-wrap">{message.body}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          mine ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {formatDateTime(message.at)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 border-t border-border pt-3">
              <Textarea
                rows={2}
                value={reply}
                onChange={(event) => setReply(event.target.value)}
                placeholder="Write a reply…"
              />
              <div className="flex justify-end">
                <Button onClick={sendReply} disabled={sending || !reply.trim()} className="gap-1.5">
                  {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                  Reply
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
