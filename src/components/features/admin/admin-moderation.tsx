"use client";

import * as React from "react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDate } from "@/lib/utils/dates";

interface ReportedListing {
  id: string;
  type: string;
  commodityName: string;
  quantity: number;
  unit: string;
  district: string;
  state: string;
  description: string;
  reportCount: number;
  reports: Array<{ reason: string; at: string }>;
  user?: { name?: string; email?: string };
  createdAt: string;
}

export function AdminModeration() {
  const [items, setItems] = React.useState<ReportedListing[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    try {
      const data = await apiFetch<ReportedListing[]>("/api/admin/listings/moderate");
      setItems(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function moderate(id: string, action: "remove" | "restore") {
    setBusy(id);
    try {
      await apiFetch("/api/admin/listings/moderate", { method: "POST", json: { id, action } });
      toast.success(action === "remove" ? "Listing removed." : "Listing restored.");
      setItems((current) => current.filter((item) => item.id !== id));
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32" />
        <Skeleton className="h-32" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Nothing to moderate"
        description="Reported listings will appear here for review."
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((listing) => (
        <Card key={listing.id}>
          <CardContent className="space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <p className="font-semibold">{listing.commodityName}</p>
                  <Badge variant="destructive">{listing.reportCount} reports</Badge>
                  <Badge variant="outline" className="capitalize">
                    {listing.type}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {listing.quantity} {listing.unit} · {listing.district}, {listing.state} · by{" "}
                  {listing.user?.name ?? "unknown"} ({listing.user?.email ?? "—"}) ·{" "}
                  {formatDate(listing.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={busy === listing.id}
                  onClick={() => void moderate(listing.id, "remove")}
                  className="gap-1.5"
                >
                  {busy === listing.id ? <Loader2 className="size-3.5 animate-spin" /> : null}
                  Remove
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === listing.id}
                  onClick={() => void moderate(listing.id, "restore")}
                >
                  Dismiss reports
                </Button>
              </div>
            </div>
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{listing.description}</p>
            <div className="space-y-1 border-t border-border pt-2">
              {listing.reports.map((report, index) => (
                <p key={index} className="text-xs text-muted-foreground">
                  • {report.reason} <span className="text-[10px]">({formatDate(report.at)})</span>
                </p>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
