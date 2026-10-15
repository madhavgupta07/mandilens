"use client";

import * as React from "react";
import { BellRing, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatINR } from "@/lib/utils/decimal";
import { UNITS } from "@/lib/domain/constants";

interface CommodityOption {
  id: string;
  name: string;
}
interface AlertItem {
  _id: string;
  commodity?: { name?: string; slug?: string } | null;
  market?: { name?: string } | null;
  district?: string;
  metric: string;
  comparator: string;
  threshold: number;
  unit: string;
  isActive: boolean;
  lastTriggeredAt?: string;
}

export function AlertsView() {
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const [commodities, setCommodities] = React.useState<CommodityOption[]>([]);
  const [loading, setLoading] = React.useState(true);

  const [form, setForm] = React.useState({
    commodityId: "",
    district: "",
    metric: "modal",
    comparator: "above",
    threshold: "",
    unit: "quintal",
  });
  const [saving, setSaving] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const [alertItems, commodityItems] = await Promise.all([
        apiFetch<AlertItem[]>("/api/alerts"),
        apiFetch<CommodityOption[]>("/api/commodities?limit=100").catch(() => []),
      ]);
      setAlerts(alertItems);
      setCommodities(commodityItems);
      setForm((current) => ({ ...current, commodityId: current.commodityId || commodityItems[0]?.id || "" }));
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
    if (!form.commodityId || !form.threshold) {
      toast.error("Pick a commodity and a threshold price.");
      return;
    }
    setSaving(true);
    try {
      await apiFetch("/api/alerts", {
        method: "POST",
        json: {
          commodityId: form.commodityId,
          district: form.district || undefined,
          metric: form.metric,
          comparator: form.comparator,
          threshold: Number(form.threshold),
          unit: form.unit,
        },
      });
      toast.success("Alert created.");
      setForm((current) => ({ ...current, threshold: "" }));
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function toggle(id: string, isActive: boolean) {
    try {
      await apiFetch(`/api/alerts/${id}`, { method: "PATCH", json: { isActive } });
      setAlerts((current) =>
        current.map((alert) => (alert._id === id ? { ...alert, isActive } : alert)),
      );
    } catch (err) {
      toast.error(errorMessage(err));
    }
  }

  async function remove(id: string) {
    try {
      await apiFetch(`/api/alerts/${id}`, { method: "DELETE" });
      setAlerts((current) => current.filter((alert) => alert._id !== id));
      toast.success("Alert deleted.");
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
        ) : alerts.length === 0 ? (
          <EmptyState
            icon={BellRing}
            title="No alerts yet"
            description="Create an alert and MandiLens will notify you only when a new observation actually crosses your threshold."
          />
        ) : (
          alerts.map((alert) => (
            <Card key={alert._id}>
              <CardContent className="flex items-center justify-between gap-4 p-4">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{alert.commodity?.name ?? "Commodity"}</p>
                    <Badge variant="outline" className="font-normal">
                      {alert.metric} {alert.comparator} {formatINR(alert.threshold)}/{alert.unit}
                    </Badge>
                    {alert.district ? (
                      <Badge variant="outline" className="font-normal">
                        {alert.district}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {alert.market?.name ? `${alert.market.name} · ` : ""}
                    {alert.isActive ? "Active" : "Paused"}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={alert.isActive}
                    onCheckedChange={(checked) => void toggle(alert._id, checked)}
                    aria-label="Toggle alert"
                  />
                  <button
                    type="button"
                    onClick={() => void remove(alert._id)}
                    className="text-muted-foreground hover:text-destructive"
                    aria-label="Delete alert"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <Card className="lg:sticky lg:top-20">
        <CardContent className="space-y-4 p-5">
          <h2 className="font-semibold">New price alert</h2>
          <form onSubmit={create} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="alert-commodity">Commodity</Label>
              <Select
                id="alert-commodity"
                value={form.commodityId}
                onChange={(event) => setForm({ ...form, commodityId: event.target.value })}
              >
                {commodities.map((commodity) => (
                  <option key={commodity.id} value={commodity.id}>
                    {commodity.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="alert-metric">Metric</Label>
                <Select
                  id="alert-metric"
                  value={form.metric}
                  onChange={(event) => setForm({ ...form, metric: event.target.value })}
                >
                  <option value="modal">Modal</option>
                  <option value="min">Minimum</option>
                  <option value="max">Maximum</option>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alert-comparator">When price is</Label>
                <Select
                  id="alert-comparator"
                  value={form.comparator}
                  onChange={(event) => setForm({ ...form, comparator: event.target.value })}
                >
                  <option value="above">Above</option>
                  <option value="below">Below</option>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="alert-threshold">Threshold ₹</Label>
                <Input
                  id="alert-threshold"
                  type="number"
                  min="1"
                  step="0.01"
                  value={form.threshold}
                  onChange={(event) => setForm({ ...form, threshold: event.target.value })}
                  placeholder="e.g. 2400"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="alert-unit">per unit</Label>
                <Select
                  id="alert-unit"
                  value={form.unit}
                  onChange={(event) => setForm({ ...form, unit: event.target.value })}
                >
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="alert-district">District (optional)</Label>
              <Input
                id="alert-district"
                value={form.district}
                onChange={(event) => setForm({ ...form, district: event.target.value })}
                placeholder="e.g. Samastipur"
              />
            </div>
            <Button type="submit" disabled={saving} className="w-full gap-1.5">
              {saving ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Create alert
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
