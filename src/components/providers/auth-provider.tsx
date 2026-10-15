"use client";

import * as React from "react";
import type { AuthUser } from "@/lib/auth/current-user";
import { apiFetch, errorMessage } from "@/lib/client/api";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
  logout: () => Promise<void>;
}

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({
  children,
  initialUser = null,
}: {
  children: React.ReactNode;
  initialUser?: AuthUser | null;
}) {
  const [user, setUser] = React.useState<AuthUser | null>(initialUser);
  const [loading, setLoading] = React.useState(false);

  const refresh = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await apiFetch<{ user: AuthUser | null }>("/api/auth/me");
      setUser(data.user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = React.useCallback(async () => {
    try {
      await apiFetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(errorMessage(error));
    }
    setUser(null);
  }, []);

  const value = React.useMemo(
    () => ({ user, loading, refresh, setUser, logout }),
    [user, loading, refresh, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = React.useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside an AuthProvider.");
  return context;
}
