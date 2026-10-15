import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/providers/auth-provider";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { Toaster } from "@/components/ui/toaster";
import type { AuthUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: {
    default: "MandiLens — AI market intelligence for agricultural trading",
    template: "%s · MandiLens",
  },
  description:
    "MandiLens compares mandi prices across markets, subtracts your transport and handling costs, and shows where the best net proceeds are — with open data, an open model and transparent calculations.",
  keywords: [
    "mandi prices",
    "AGMARKNET",
    "agriculture",
    "market intelligence",
    "open source",
    "Gemma",
  ],
  openGraph: {
    title: "MandiLens — AI market intelligence for agricultural trading",
    description:
      "Compare mandi prices by net proceeds after transport and handling. Open data, open model, transparent maths.",
    type: "website",
  },
};

async function getInitialUser(): Promise<AuthUser | null> {
  try {
    const { getCurrentUser } = await import("@/lib/auth/current-user");
    return await getCurrentUser();
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getInitialUser();

  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AuthProvider initialUser={user}>
          <div className="flex min-h-screen flex-col">
            <SiteHeader />
            <main className="flex-1">{children}</main>
            <SiteFooter />
          </div>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
