import { PageHeader } from "@/components/domain/layout";
import { RequireAuth } from "@/components/features/app/require-auth";
import { AppNav } from "@/components/features/app/app-nav";
import { NotificationsView } from "@/components/features/app/notifications-view";

export const metadata = { title: "Notifications" };

export default function NotificationsPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <AppNav />
      <PageHeader
        eyebrow="Monitoring"
        title="Notifications"
        description="Alerts that fired and replies to your inquiries."
      />
      <RequireAuth>
        <NotificationsView />
      </RequireAuth>
    </div>
  );
}
