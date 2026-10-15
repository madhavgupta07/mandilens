"use client";

import * as React from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumberIN } from "@/lib/utils/decimal";
import { formatDate } from "@/lib/utils/dates";

export interface HistoryPoint {
  date: string;
  modalPrice: number | null;
  minPrice: number | null;
  maxPrice: number | null;
  unit: string;
  isDemo: boolean;
}

export function PriceHistoryChart({
  points,
  height = 280,
  loading = false,
}: {
  points: HistoryPoint[];
  height?: number;
  loading?: boolean;
}) {
  const data = React.useMemo(
    () =>
      points
        .map((point) => ({
          date: point.date,
          modal: point.modalPrice,
          min: point.minPrice,
          max: point.maxPrice,
        }))
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [points],
  );

  if (loading) {
    return <Skeleton style={{ height }} className="w-full" />;
  }

  if (data.length < 2) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-sm text-muted-foreground"
        style={{ height }}
      >
        Not enough history to draw a trend yet.
      </div>
    );
  }

  const unit = points[0]?.unit ?? "quintal";

  return (
    <div style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
          <defs>
            <linearGradient id="modalFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--color-primary)" stopOpacity={0.35} />
              <stop offset="95%" stopColor="var(--color-primary)" stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={(value: string) => formatDate(value).slice(0, 6)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            minTickGap={28}
            stroke="var(--color-border)"
          />
          <YAxis
            tickFormatter={(value: number) => formatNumberIN(value)}
            tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }}
            width={56}
            stroke="var(--color-border)"
          />
          <Tooltip
            formatter={(value) => [
              `₹${formatNumberIN(Number(value))}/${unit}`,
              "Modal price",
            ]}
            labelFormatter={(label) => formatDate(String(label))}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid var(--color-border)",
              background: "var(--color-card)",
              fontSize: 12,
            }}
          />
          <Area
            type="monotone"
            dataKey="modal"
            stroke="var(--color-primary)"
            strokeWidth={2}
            fill="url(#modalFill)"
            connectNulls
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
