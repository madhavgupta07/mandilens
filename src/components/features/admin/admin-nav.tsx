"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Gauge, Database, Upload, Users, ShieldAlert, ScrollText } from "lucide-react";
import { cn } from "@/lib/utils/cn";

const LINKS = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/sources", label: "Sources", icon: Database },
  { href: "/admin/imports", label: "Imports", icon: Upload },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/moderation", label: "Moderation", icon: ShieldAlert },
  { href: "/admin/audit", label: "Audit log", icon: ScrollText },
];

export function AdminNav() {
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
