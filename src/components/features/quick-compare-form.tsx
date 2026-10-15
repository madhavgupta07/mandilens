"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiFetch } from "@/lib/client/api";
import { UNITS } from "@/lib/domain/constants";

interface CommodityOption {
  id: string;
  name: string;
  slug: string;
}

export function QuickCompareForm() {
  const router = useRouter();
  const [commodities, setCommodities] = React.useState<CommodityOption[]>([]);
  const [commoditySlug, setCommoditySlug] = React.useState("");
  const [quantity, setQuantity] = React.useState("50");
  const [unit, setUnit] = React.useState("quintal");
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<CommodityOption[]>("/api/commodities?limit=100")
      .then((items) => {
        setCommodities(items);
        if (items[0]) setCommoditySlug(items[0].slug);
      })
      .catch(() => setCommodities([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
      onSubmit={(event) => {
        event.preventDefault();
        const params = new URLSearchParams({
          commodity: commoditySlug,
          quantity,
          unit,
        });
        router.push(`/compare?${params.toString()}`);
      }}
    >
      <div className="space-y-1.5">
        <Label htmlFor="quick-commodity">Commodity</Label>
        <Select
          id="quick-commodity"
          value={commoditySlug}
          onChange={(event) => setCommoditySlug(event.target.value)}
          disabled={loading}
        >
          {loading ? <option>Loading…</option> : null}
          {commodities.map((commodity) => (
            <option key={commodity.id} value={commodity.slug}>
              {commodity.name}
            </option>
          ))}
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="quick-quantity">Quantity</Label>
        <Input
          id="quick-quantity"
          type="number"
          min="0.01"
          step="0.01"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          className="sm:w-28"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="quick-unit">Unit</Label>
        <Select id="quick-unit" value={unit} onChange={(event) => setUnit(event.target.value)}>
          {UNITS.map((u) => (
            <option key={u} value={u}>
              {u}
            </option>
          ))}
        </Select>
      </div>
      <Button type="submit" className="gap-2" disabled={!commoditySlug}>
        Compare markets <ArrowRight className="size-4" />
      </Button>
    </form>
  );
}
