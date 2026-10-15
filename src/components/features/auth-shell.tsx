import Link from "next/link";
import { Sprout } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="surface-grid flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="size-5" />
          </span>
          <h1 className="text-2xl font-bold">{title}</h1>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Card>
          <CardContent className="p-6">{children}</CardContent>
        </Card>
        {footer ? <div className="text-center text-sm text-muted-foreground">{footer}</div> : null}
        <p className="text-center text-xs text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            ← Back to MandiLens
          </Link>
        </p>
      </div>
    </div>
  );
}
