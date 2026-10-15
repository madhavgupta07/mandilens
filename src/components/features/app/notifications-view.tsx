"use client";

import * as React from "react";
import Link from "next/link";
import { Bell, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/utils/dates";
import { cn } from "@/lib/utils/cn";

interface NotificationItem {
  _id: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

interface NotificationsResponse {
  items: NotificationItem[];
  unreadCount: number;
}

export function NotificationsView() {
  const [data, setData] = React.useState<NotificationsResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [marking, setMarking] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const result = await apiFetch<NotificationsResponse>("/api/notifications?limit=50");
      setData(result);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function markAll() {
    setMarking(true);
    try {
      await apiFetch("/api/notifications", { method: "POST", json: {} });
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setMarking(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
        <Skeleton className="h-16" />
      </div>
    );
  }

  if (!data || data.items.length === 0) {
    return (
      <EmptyState
        icon={Bell}
        title="No notifications"
        description="When a price alert fires or someone replies to your inquiry, you'll see it here."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {data.unreadCount} unread of {data.items.length}
        </p>
        {data.unreadCount > 0 ? (
          <Button size="sm" variant="outline" onClick={markAll} disabled={marking} className="gap-1.5">
            {marking ? <Loader2 className="size-4 animate-spin" /> : <CheckCheck className="size-4" />}
            Mark all read
          </Button>
        ) : null}
      </div>

      {data.items.map((notification) => (
        <Card key={notification._id} className={cn(!notification.isRead && "border-primary/40 bg-primary-muted/30")}>
          <CardContent className="flex items-start gap-3 p-4">
            <Bell className={cn("mt-0.5 size-4", notification.isRead ? "text-muted-foreground" : "text-primary")} />
            <div className="flex-1 space-y-1">
              <div className="flex items-center gap-2">
                <p className="font-medium">{notification.title}</p>
                {!notification.isRead ? (
                  <Badge variant="default" className="font-normal">
                    New
                  </Badge>
                ) : null}
              </div>
              {notification.body ? (
                <p className="text-sm text-muted-foreground">{notification.body}</p>
              ) : null}
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span>{formatDateTime(notification.createdAt)}</span>
                {notification.link ? (
                  <Link href={notification.link} className="text-primary hover:underline">
                    Open
                  </Link>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
