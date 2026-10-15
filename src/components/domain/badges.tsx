import { Badge } from "@/components/ui/badge";
import { sourceLabel } from "@/lib/domain/sources";
import { cn } from "@/lib/utils/cn";
import { FlaskConical, Database, Clock } from "lucide-react";

export function DemoDataBadge({ className }: { className?: string }) {
  return (
    <Badge variant="demo" className={cn("gap-1", className)}>
      <FlaskConical className="size-3" />
      Demo data
    </Badge>
  );
}

export function SourceBadge({ dataSource, className }: { dataSource: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("gap-1 font-normal", className)}>
      <Database className="size-3 text-muted-foreground" />
      {sourceLabel(dataSource)}
    </Badge>
  );
}

const FRESHNESS_STYLES: Record<string, string> = {
  fresh: "border-transparent bg-emerald-100 text-emerald-800",
  recent: "border-transparent bg-lime-100 text-lime-800",
  aging: "border-transparent bg-amber-100 text-amber-900",
  stale: "border-transparent bg-red-100 text-red-800",
};

export function FreshnessBadge({
  level,
  label,
  ageDays,
  className,
}: {
  level: string;
  label: string;
  ageDays?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        FRESHNESS_STYLES[level] ?? "bg-muted text-muted-foreground",
        className,
      )}
    >
      <Clock className="size-3" />
      {label}
      {typeof ageDays === "number" ? ` · ${ageDays}d` : ""}
    </span>
  );
}
