"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sprout,
  Menu,
  X,
  User as UserIcon,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils/cn";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparatorLine,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/components/providers/auth-provider";

const NAV_LINKS = [
  { href: "/compare", label: "Compare" },
  { href: "/markets", label: "Markets" },
  { href: "/commodities", label: "Commodities" },
  { href: "/listings", label: "Marketplace" },
  { href: "/copilot", label: "AI Copilot" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = React.useState(false);

  const isAdmin = user?.roles.includes("admin") ?? false;

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur">
      <div className="container-page flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Sprout className="size-4" />
            </span>
            <span className="text-lg tracking-tight">MandiLens</span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {NAV_LINKS.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium transition-colors",
                    active ? "bg-primary-muted text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="demo" className="hidden lg:inline-flex">
            Open source · Hacktoberfest 2026
          </Badge>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <UserIcon className="size-4" />
                  <span className="hidden max-w-[8rem] truncate sm:inline">{user.name}</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="truncate">{user.email}</DropdownMenuLabel>
                <DropdownMenuSeparatorLine />
                <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                  <LayoutDashboard /> Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/copilot")}>
                  <Sparkles /> AI Copilot
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/alerts")}>
                  <ShieldCheck /> Alerts & watchlists
                </DropdownMenuItem>
                {isAdmin ? (
                  <DropdownMenuItem onClick={() => router.push("/admin")}>
                    <ShieldCheck /> Admin console
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuSeparatorLine />
                <DropdownMenuItem
                  onClick={async () => {
                    await logout();
                    router.push("/");
                    router.refresh();
                  }}
                >
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden items-center gap-2 sm:flex">
              <Button asChild variant="ghost" size="sm">
                <Link href="/login">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/register">Get started</Link>
              </Button>
            </div>
          )}

          <button
            type="button"
            className="flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden"
            onClick={() => setMobileOpen((open) => !open)}
            aria-label="Toggle navigation"
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background md:hidden">
          <nav className="container-page flex flex-col py-2">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className="rounded-md px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted"
              >
                {link.label}
              </Link>
            ))}
            {!user ? (
              <div className="flex gap-2 px-3 py-2">
                <Button asChild variant="outline" size="sm" className="flex-1">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm" className="flex-1">
                  <Link href="/register">Register</Link>
                </Button>
              </div>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}
