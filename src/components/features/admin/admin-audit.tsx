"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/domain/layout";
import { ScrollText } from "lucide-react";
import { apiFetch, errorMessage } from "@/lib/client/api";
import { formatDateTime } from "@/lib/utils/dates";

interface AuditEntry {
  id: string;
  actorLabel: string;
  action: string;
  entityType: string;
  entityId?: string;
  meta?: Record<string, unknown>;
  ip?: string;
  createdAt: string;
}

export function AdminAudit() {
  const [logs, setLogs] = React.useState<AuditEntry[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    apiFetch<AuditEntry[]>("/api/admin/audit?limit=100")
      .then(setLogs)
      .catch(() => setLogs([]))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 8 }).map((_, index) => (
          <Skeleton key={index} className="h-12" />
        ))}
      </div>
    );
  }

  if (logs.length === 0) {
    return <EmptyState icon={ScrollText} title="No audit entries yet" description="Actions will be recorded here." />;
  }

  return (
    <Card>
      <CardContent className="p-0">
        <ul className="divide-y divide-border">
          {logs.map((log) => (
            <li key={log.id} className="flex items-start justify-between gap-4 px-5 py-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  <span className="font-mono text-xs text-primary">{log.action}</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {log.actorLabel} · {log.entityType}
                  {log.entityId ? ` ${log.entityId.slice(-6)}` : ""}
                  {log.ip ? ` · ${log.ip}` : ""}
                </p>
                {log.meta && Object.keys(log.meta).length > 0 ? (
                  <p className="font-mono text-[11px] text-muted-foreground">
                    {JSON.stringify(log.meta).slice(0, 160)}
                  </p>
                ) : null}
              </div>
              <span className="whitespace-nowrap text-xs text-muted-foreground">
                {formatDateTime(log.createdAt)}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
