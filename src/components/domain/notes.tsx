import { Alert, AlertDescription } from "@/components/ui/alert";
import { Info, ShieldAlert } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export function DisclaimerNote({ className, text }: { className?: string; text?: string }) {
  return (
    <Alert variant="warning" className={cn("flex items-start gap-3", className)}>
      <ShieldAlert className="mt-0.5 size-4 shrink-0" />
      <AlertDescription className="text-xs leading-relaxed">
        {text ??
          "Estimates are based on the data shown and the assumptions you supplied. They are not a guarantee of profit, and prices may change before you sell."}
      </AlertDescription>
    </Alert>
  );
}

export function DataNote({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground",
        className,
      )}
    >
      <Info className="mt-0.5 size-3.5 shrink-0" />
      <div className="leading-relaxed">{children}</div>
    </div>
  );
}
