"use client";

import * as React from "react";
import { Search, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDate } from "@/lib/utils/dates";

interface AdminUser {
  id: string;
  name: string;
  email: string;
  roles: string[];
  state?: string;
  district?: string;
  isActive: boolean;
  isDemo: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

export function AdminUsers() {
  const [users, setUsers] = React.useState<AdminUser[]>([]);
  const [search, setSearch] = React.useState("");
  const [loading, setLoading] = React.useState(true);
  const [busy, setBusy] = React.useState<string | null>(null);

  const load = React.useCallback(async (q: string) => {
    setLoading(true);
    try {
      const data = await apiFetch<AdminUser[]>(`/api/admin/users?limit=100${q ? `&q=${encodeURIComponent(q)}` : ""}`);
      setUsers(data);
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    const handle = setTimeout(() => void load(search), 250);
    return () => clearTimeout(handle);
  }, [search, load]);

  async function updateUser(user: AdminUser, patch: { roles?: string[]; isActive?: boolean }) {
    setBusy(user.id);
    try {
      await apiFetch(`/api/admin/users/${user.id}`, { method: "PATCH", json: patch });
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, ...patch } : item)),
      );
      toast.success("Updated.");
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search name or email…"
          className="pl-9"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="space-y-2 p-5">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Admin</TableHead>
                  <TableHead>Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">
                        {user.name}
                        {user.isDemo ? (
                          <Badge variant="demo" className="ml-2">
                            demo
                          </Badge>
                        ) : null}
                      </div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {user.district ? `${user.district}, ` : ""}
                      {user.state ?? "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatDate(user.createdAt)}
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        disabled={busy === user.id}
                        onClick={() =>
                          updateUser(user, {
                            roles: user.roles.includes("admin")
                              ? ["trader"]
                              : [...new Set([...user.roles, "admin"])],
                          })
                        }
                        className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline disabled:opacity-50"
                      >
                        {busy === user.id ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : (
                          <ShieldCheck className="size-3.5" />
                        )}
                        {user.roles.includes("admin") ? "Revoke" : "Grant"}
                      </button>
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={user.isActive}
                        disabled={busy === user.id}
                        onCheckedChange={(checked) => updateUser(user, { isActive: checked })}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        The system always keeps at least one active administrator.
      </p>
    </div>
  );
}
