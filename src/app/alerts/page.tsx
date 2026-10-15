import { PageHeader } from "@/components/domain/layout";
import { RequireAuth } from "@/components/features/app/require-auth";
import { AppNav } from "@/components/features/app/app-nav";
import { AlertsView } from "@/components/features/app/alerts-view";

export const metadata = { title: "Price alerts" };

export default function AlertsPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <AppNav />
      <PageHeader
        eyebrow="Monitoring"
        title="Price alerts"
        description="Get notified only when a new observation actually crosses your threshold — never for the same data twice."
      />
      <RequireAuth>
        <AlertsView />
      </RequireAuth>
    </div>
  );
}
