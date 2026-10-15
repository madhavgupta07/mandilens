"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/components/providers/auth-provider";

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  if (loading) {
    return (
      <div className="container-page space-y-4 py-10">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container-page py-16">
        <Card className="mx-auto max-w-md">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <span className="flex size-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
              <Lock className="size-5" />
            </span>
            <div className="space-y-1">
              <p className="font-semibold">Sign in required</p>
              <p className="text-sm text-muted-foreground">
                This area is for signed-in users. Sign in to continue.
              </p>
            </div>
            <div className="flex gap-2">
              <Button asChild>
                <Link href={`/login?next=${encodeURIComponent(pathname)}`}>Sign in</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/register">Create account</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}
