"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, TriangleAlert, CircleCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch, errorMessage } from "@/lib/client/api";

export function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") ?? "";
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [done, setDone] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await apiFetch("/api/auth/reset-password", {
        method: "POST",
        json: { token, password },
      });
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <Alert variant="destructive">
        <TriangleAlert className="size-4" />
        <AlertDescription>
          This reset link is missing its token. Request a new link from the forgot-password page.
        </AlertDescription>
      </Alert>
    );
  }

  if (done) {
    return (
      <Alert variant="success">
        <CircleCheck className="size-4" />
        <AlertDescription>
          Password updated. Redirecting you to sign in…
        </AlertDescription>
      </Alert>
    );
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
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="confirm">Confirm password</Label>
        <Input
          id="confirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full gap-1.5">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Reset password
      </Button>
    </form>
  );
}
