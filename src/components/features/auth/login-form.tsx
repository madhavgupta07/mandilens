"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch, errorMessage } from "@/lib/client/api";
import type { AuthUser } from "@/lib/auth/current-user";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser } = useAuth();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  const next = searchParams.get("next") || "/dashboard";

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/login", {
        method: "POST",
        json: { email, password },
      });
      setUser(data.user);
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error ? (
        <Alert variant="destructive">
          <TriangleAlert className="size-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </div>
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link href="/forgot-password" className="text-xs text-primary hover:underline">
            Forgot?
          </Link>
        </div>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          required
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full gap-1.5">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Sign in
      </Button>
    </form>
  );
}
