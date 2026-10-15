import { PageHeader } from "@/components/domain/layout";
import { RequireAuth } from "@/components/features/app/require-auth";
import { AppNav } from "@/components/features/app/app-nav";
import { WatchlistsView } from "@/components/features/app/watchlists-view";

export const metadata = { title: "Watchlists" };

export default function WatchlistsPage() {
  return (
    <div className="container-page space-y-6 py-10">
      <AppNav />
      <PageHeader
        eyebrow="Monitoring"
        title="Watchlists"
        description="Group the commodities you care about so you can review their markets at a glance."
      />
      <RequireAuth>
        <WatchlistsView />
      </RequireAuth>
    </div>
  );
}
