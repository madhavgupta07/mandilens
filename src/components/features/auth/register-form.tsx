"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAuth } from "@/components/providers/auth-provider";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { ROLE_LABELS, USER_ROLES } from "@/lib/domain/constants";
import type { AuthUser } from "@/lib/auth/current-user";

const SELF_ROLES = USER_ROLES.filter((role) => role !== "admin");

export function RegisterForm() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [form, setForm] = React.useState({
    name: "",
    email: "",
    password: "",
    role: "farmer",
    state: "",
    district: "",
    phone: "",
  });
  const [error, setError] = React.useState<string | null>(null);
  const [submitting, setSubmitting] = React.useState(false);

  function update(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const data = await apiFetch<{ user: AuthUser }>("/api/auth/register", {
        method: "POST",
        json: {
          name: form.name,
          email: form.email,
          password: form.password,
          role: form.role,
          state: form.state || undefined,
          district: form.district || undefined,
          phone: form.phone || undefined,
        },
      });
      setUser(data.user);
      router.push("/dashboard");
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
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          value={form.name}
          onChange={(event) => update("name", event.target.value)}
          autoComplete="name"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={form.email}
          onChange={(event) => update("email", event.target.value)}
          autoComplete="email"
          required
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={form.password}
          onChange={(event) => update("password", event.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="role">I am a…</Label>
          <Select id="role" value={form.role} onChange={(event) => update("role", event.target.value)}>
            {SELF_ROLES.map((role) => (
              <option key={role} value={role}>
                {ROLE_LABELS[role]}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone (optional)</Label>
          <Input
            id="phone"
            value={form.phone}
            onChange={(event) => update("phone", event.target.value)}
            autoComplete="tel"
          />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="state">State (optional)</Label>
          <Input id="state" value={form.state} onChange={(event) => update("state", event.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="district">District (optional)</Label>
          <Input
            id="district"
            value={form.district}
            onChange={(event) => update("district", event.target.value)}
          />
        </div>
      </div>
      <Button type="submit" disabled={submitting} className="w-full gap-1.5">
        {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
        Create account
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        By registering you agree to the{" "}
        <Link href="/legal/terms" className="underline">
          terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline">
          privacy policy
        </Link>
        .
      </p>
    </form>
  );
}
