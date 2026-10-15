import { RequireAuth } from "@/components/features/app/require-auth";
import { AppNav } from "@/components/features/app/app-nav";
import { DashboardView } from "@/components/features/app/dashboard-view";

export const metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <AppNav />
      <RequireAuth>
        <DashboardView />
      </RequireAuth>
    </div>
  );
}
