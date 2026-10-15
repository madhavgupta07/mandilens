import Link from "next/link";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  className,
}: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between", className)}>
      <div className="space-y-1.5">
        {eyebrow ? (
          <p className="text-xs font-semibold uppercase tracking-widest text-primary">{eyebrow}</p>
        ) : null}
        <h1 className="text-2xl font-bold sm:text-3xl">{title}</h1>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon,
  actionHref,
  actionLabel,
  className,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card/60 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Icon className="size-5" />
        </span>
      ) : null}
      <div className="space-y-1">
        <p className="font-semibold">{title}</p>
        {description ? (
          <p className="mx-auto max-w-md text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {actionHref && actionLabel ? (
        <Button asChild size="sm" variant="outline">
          <Link href={actionHref}>{actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  icon?: LucideIcon;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
        {Icon ? <Icon className="size-4 text-muted-foreground" /> : null}
      </div>
      <p className="mt-2 text-2xl font-bold tabular-nums">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}
