"use client";

import * as React from "react";
import Link from "next/link";
import { Bookmark, Trash2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDate } from "@/lib/utils/dates";

interface SavedComparison {
  _id: string;
  title: string;
  input: Record<string, unknown>;
  result: Record<string, unknown>;
  createdAt: string;
}

export function SavedView() {
  const [items, setItems] = React.useState<SavedComparison[]>([]);
  const [loading, setLoading] = React.useState(true);

  const load = React.useCallback(async () => {
    try {
      const data = await apiFetch<SavedComparison[]>("/api/saved-comparisons");
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

  async function remove(id: string) {
    try {
      await apiFetch(`/api/saved-comparisons/${id}`, { method: "DELETE" });
      setItems((current) => current.filter((item) => item._id !== id));
      toast.success("Removed.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={Bookmark}
        title="No saved comparisons"
        description="Run a comparison and give it a name to save it here for later."
        actionHref="/compare"
        actionLabel="Open the compare workbench"
      />
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const commodity = (item.result?.commodity ?? {}) as { name?: string; slug?: string };
        const result = (item.result?.result ?? {}) as {
          bestMarketName?: string;
          bestNetProceeds?: number;
        };
        return (
          <Card key={item._id}>
            <CardContent className="flex items-center justify-between gap-4 p-5">
              <div className="space-y-1">
                <p className="font-semibold">{item.title}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="font-normal">
                    {commodity.name ?? "Commodity"}
                  </Badge>
                  {result.bestMarketName ? <span>Best: {result.bestMarketName}</span> : null}
                  <span>· {formatDate(item.createdAt)}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {commodity.slug ? (
                  <Button asChild size="sm" variant="outline" className="gap-1">
                    <Link href={`/compare?commodity=${commodity.slug}`}>
                      Re-run <ExternalLink className="size-3.5" />
                    </Link>
                  </Button>
                ) : null}
                <button
                  type="button"
                  onClick={() => void remove(item._id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete saved comparison"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
