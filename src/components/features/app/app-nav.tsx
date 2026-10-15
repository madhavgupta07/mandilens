"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, BellRing, Star, MessageSquare, Bookmark, Bell } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/alerts", label: "Alerts", icon: BellRing },
  { href: "/watchlists", label: "Watchlists", icon: Star },
  { href: "/inquiries", label: "Inquiries", icon: MessageSquare },
  { href: "/saved", label: "Saved", icon: Bookmark },
  { href: "/notifications", label: "Notifications", icon: Bell },
];

export function AppNav() {
  const pathname = usePathname();
  return (
    <nav className="flex flex-wrap gap-2 border-b border-border pb-3">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <link.icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
