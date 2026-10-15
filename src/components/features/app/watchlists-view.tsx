"use client";

import * as React from "react";
import { Star, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { apiFetch, errorMessage } from "@/lib/client/api";

interface CommodityOption {
  id: string;
  name: string;
}
interface WatchlistItem {
  _id: string;
  name: string;
  commodities?: Array<{ _id?: string; name?: string }>;
  markets?: Array<{ _id?: string; name?: string }>;
  districts?: string[];
}

export function WatchlistsView() {
  const [lists, setLists] = React.useState<WatchlistItem[]>([]);
  const [commodities, setCommodities] = React.useState<CommodityOption[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [name, setName] = React.useState("");
  const [selected, setSelected] = React.useState<string[]>([]);
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [watchlists, commodityItems] = await Promise.all([
        apiFetch<WatchlistItem[]>("/api/watchlists"),
        apiFetch<CommodityOption[]>("/api/commodities?limit=100").catch(() => []),
      ]);
      setLists(watchlists);
      setCommodities(commodityItems);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (name.trim().length < 2) {
      toast.error("Give the watchlist a name.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/watchlists", {
        method: "POST",
        json: { name: name.trim(), commodityIds: selected, marketIds: [], districts: [] },
      });
      toast.success("Watchlist created.");
      setName("");
      setSelected([]);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/watchlists/${id}`, { method: "DELETE" });
      setLists((current) => current.filter((list) => list._id !== id));
      toast.success("Watchlist deleted.");
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-4">
        {loading ? (
          <>
            <Skeleton className="h-20" />
            <Skeleton className="h-20" />
          </>
        ) : lists.length === 0 ? (
          <EmptyState
            icon={Star}
            title="No watchlists yet"
            description="Group the commodities you trade into a watchlist to keep an eye on them."
          />
        ) : (
          lists.map((list) => (
            <Card key={list._id}>
              <CardContent className="flex items-start justify-between gap-4 p-5">
                <div className="space-y-2">
                  <p className="font-semibold">{list.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {list.commodities && list.commodities.length > 0 ? (
                      list.commodities.map((commodity) => (
                        <Badge key={commodity._id} variant="outline" className="font-normal capitalize">
                          {commodity.name}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-xs text-muted-foreground">No commodities selected.</span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(list._id)}
                  className="text-muted-foreground hover:text-destructive"
                  aria-label="Delete watchlist"
                >
                  <Trash2 className="size-4" />
                </button>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="lg:sticky lg:top-20">
        <CardContent className="space-y-4 p-5">
          <h2 className="font-semibold">New watchlist</h2>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="watch-name">Name</Label>
              <Input
                id="watch-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="e.g. Kharif staples"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Commodities</Label>
              <div className="max-h-52 space-y-1 overflow-y-auto rounded-md border border-border p-2">
                {commodities.map((commodity) => {
                  const checked = selected.includes(commodity.id);
                  return (
                    <label
                      key={commodity.id}
                      className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(value) =>
                          setSelected((current) =>
                            value
                              ? [...current, commodity.id]
                              : current.filter((id) => id !== commodity.id),
                          )
                        }
                      />
                      {commodity.name}
                    </label>
                  );
                })}
              </div>
            </div>
            <Button type="submit" disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create watchlist
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
