"use client";

import * as React from "react";
import { Loader2, MailCheck, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { apiFetch, errorMessage } from "@/lib/client/api";

interface ResetResponse {
  requested: boolean;
  devToken?: string;
  devResetUrl?: string;
}

export function ForgotPasswordForm() {
  const [email, setEmail] = React.useState("");
  const [result, setResult] = React.useState<ResetResponse | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<ResetResponse>("/api/auth/forgot-password", {
        method: "POST",
        json: { email },
      });
      setResult(data);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (result?.requested) {
    return (
      <div className="space-y-4">
        <Alert variant="success">
          <MailCheck className="size-4" />
          <AlertDescription>
            If an account exists for that email, we&apos;ve sent reset instructions.
          </AlertDescription>
        </Alert>
        {result.devResetUrl ? (
          <Alert variant="warning">
            <AlertDescription className="space-y-1 text-xs">
              <p className="font-medium">Development mode — email isn&apos;t configured.</p>
              <p>Use this link to reset the password:</p>
              <a href={result.devResetUrl} className="break-all underline">
                {result.devResetUrl}
              </a>
            </AlertDescription>
          </Alert>
        ) : null}
      </div>
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
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <Button type="submit" disabled={submitting} className="w-full gap-1.5">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Send reset link
      </Button>
    </form>
  );
}
