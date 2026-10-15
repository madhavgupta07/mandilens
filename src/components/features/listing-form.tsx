"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input, Select, Textarea } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EmptyState } from "@/components/domain/layout";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { UNITS } from "@/lib/domain/constants";

interface CommodityOption {
  id: string;
  name: string;
}
interface MetaResponse {
  states: string[];
  districts: string[];
}

export function ListingForm() {
  const { user } = useAuth();
  const router = useRouter();

  const [commodities, setCommodities] = React.useState<CommodityOption[]>([]);
  const [meta, setMeta] = React.useState<MetaResponse>({ states: [], districts: [] });
  const [submitting, setSubmitting] = React.useState(false);

  const [form, setForm] = React.useState({
    type: "sell",
    commodityId: "",
    quantity: "",
    unit: "quintal",
    grade: "",
    state: "",
    district: "",
    pricePerUnit: "",
    priceUnit: "quintal",
    availabilityDate: "",
    expiresAt: "",
    description: "",
    contactPreference: "in_app",
    contactPhone: "",
    contactEmail: "",
  });

  React.useEffect(() => {
    apiFetch<CommodityOption[]>("/api/commodities?limit=100")
      .then(setCommodities)
      .catch(() => setCommodities([]));
    apiFetch<MetaResponse>("/api/markets/meta")
      .then(setMeta)
      .catch(() => setMeta({ states: [], districts: [] }));
  }, []);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.commodityId) {
      toast.error("Choose a commodity.");
      return;
    }
    if (form.description.trim().length < 20) {
      toast.error("Please describe the listing in at least 20 characters.");
      return;
    }
    setSubmitting(true);
    try {
      const listing = await apiFetch<{ _id: string }>("/api/listings", {
        method: "POST",
        json: {
          type: form.type,
          commodityId: form.commodityId,
          quantity: Number(form.quantity),
          unit: form.unit,
          grade: form.grade || undefined,
          state: form.state,
          district: form.district,
          pricePerUnit: form.pricePerUnit ? Number(form.pricePerUnit) : undefined,
          priceUnit: form.priceUnit,
          availabilityDate: form.availabilityDate || undefined,
          expiresAt: form.expiresAt || undefined,
          description: form.description.trim(),
          contactPreference: form.contactPreference,
          contactPhone: form.contactPhone || undefined,
          contactEmail: form.contactEmail || undefined,
        },
      });
      toast.success("Listing published.");
      router.push(`/listings/${listing._id}`);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!user) {
    return (
      <EmptyState
        title="Sign in to post a listing"
        description="Creating a listing requires an account so buyers and sellers can reach you."
        actionHref="/login?next=/listings/new"
        actionLabel="Sign in"
      />
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={submit} className="space-y-5">
          <div className="flex rounded-md border border-border p-0.5">
            {(["sell", "buy"] as const).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => update("type", option)}
                className={
                  "flex-1 rounded px-3 py-2 text-sm font-medium transition-colors " +
                  (form.type === option
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted")
                }
              >
                {option === "sell" ? "I'm selling" : "I want to buy"}
              </button>
            ))}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="commodityId">Commodity</Label>
              <Select
                id="commodityId"
                value={form.commodityId}
                onChange={(event) => update("commodityId", event.target.value)}
                required
              >
                <option value="">Select…</option>
                {commodities.map((commodity) => (
                  <option key={commodity.id} value={commodity.id}>
                    {commodity.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.quantity}
                  onChange={(event) => update("quantity", event.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="unit">Unit</Label>
                <Select id="unit" value={form.unit} onChange={(event) => update("unit", event.target.value)}>
                  {UNITS.map((unit) => (
                    <option key={unit} value={unit}>
                      {unit}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Select id="state" value={form.state} onChange={(event) => update("state", event.target.value)} required>
                <option value="">Select…</option>
                {meta.states.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="district">District</Label>
              <Input
                id="district"
                list="district-options"
                value={form.district}
                onChange={(event) => update("district", event.target.value)}
                placeholder="e.g. Samastipur"
                required
              />
              <datalist id="district-options">
                {meta.districts.map((district) => (
                  <option key={district} value={district} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="pricePerUnit">Asking price ₹ (optional)</Label>
              <Input
                id="pricePerUnit"
                type="number"
                min="0"
                step="0.01"
                value={form.pricePerUnit}
                onChange={(event) => update("pricePerUnit", event.target.value)}
                placeholder="e.g. 2300"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="priceUnit">per unit</Label>
              <Select
                id="priceUnit"
                value={form.priceUnit}
                onChange={(event) => update("priceUnit", event.target.value)}
              >
                {UNITS.map((unit) => (
                  <option key={unit} value={unit}>
                    {unit}
                  </option>
                ))}
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="grade">Grade (optional)</Label>
              <Input
                id="grade"
                value={form.grade}
                onChange={(event) => update("grade", event.target.value)}
                placeholder="e.g. FAQ"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="availabilityDate">Available from (optional)</Label>
              <Input
                id="availabilityDate"
                type="date"
                value={form.availabilityDate}
                onChange={(event) => update("availabilityDate", event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="expiresAt">Listing expires (optional)</Label>
              <Input
                id="expiresAt"
                type="date"
                value={form.expiresAt}
                onChange={(event) => update("expiresAt", event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={4}
              value={form.description}
              onChange={(event) => update("description", event.target.value)}
              placeholder="Quality, packaging, pickup/delivery, payment terms…"
              minLength={20}
              required
            />
            <p className="text-xs text-muted-foreground">{form.description.length}/2000</p>
          </div>

          <div className="space-y-3 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-sm font-medium">How should people reach you?</p>
            <div className="flex gap-2">
              {(["in_app", "phone", "email"] as const).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => update("contactPreference", option)}
                  className={
                    "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors " +
                    (form.contactPreference === option
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-muted-foreground hover:bg-muted")
                  }
                >
                  {option.replace("_", " ")}
                </button>
              ))}
            </div>
            {form.contactPreference === "phone" ? (
              <div className="space-y-1.5">
                <Label htmlFor="contactPhone" className="text-xs">
                  Phone
                </Label>
                <Input
                  id="contactPhone"
                  value={form.contactPhone}
                  onChange={(event) => update("contactPhone", event.target.value)}
                  placeholder="+91…"
                />
              </div>
            ) : null}
            {form.contactPreference === "email" ? (
              <div className="space-y-1.5">
                <Label htmlFor="contactEmail" className="text-xs">
                  Email
                </Label>
                <Input
                  id="contactEmail"
                  type="email"
                  value={form.contactEmail}
                  onChange={(event) => update("contactEmail", event.target.value)}
                />
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between gap-3">
            <p className="text-xs text-muted-foreground">
              By posting you agree to the{" "}
              <Link href="/legal/terms" className="underline">
                terms
              </Link>
              .
            </p>
            <Button type="submit" disabled={submitting} className="gap-1.5">
              {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
              Publish listing
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
