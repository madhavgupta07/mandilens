"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!user) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <ShieldAlert className="size-6 text-muted-foreground" />
          <p className="font-semibold">Sign in as an administrator</p>
          <Button asChild>
            <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!user.roles.includes("admin")) {
    return (
      <Card className="mx-auto max-w-md">
        <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
          <ShieldAlert className="size-6 text-destructive" />
          <div className="space-y-1">
            <p className="font-semibold">Administrators only</p>
            <p className="text-sm text-muted-foreground">
              Your account doesn&apos;t have access to the admin console.
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return <>{children}</>;
}
