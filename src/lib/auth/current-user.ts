import { cookies } from "next/headers";
import { connectToDatabase } from "@/lib/db/connect";
import { User, type IUser } from "@/lib/db/models";
import { ApiError } from "@/lib/api/response";
import { SESSION_COOKIE, verifySession } from "./session";
import type { UserRole } from "@/lib/domain/constants";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  roles: UserRole[];
  state?: string;
  district?: string;
  isDemo: boolean;
  isActive: boolean;
}

export function sanitizeUser(user: Pick<IUser, "_id" | "name" | "email" | "roles" | "state" | "district" | "isDemo" | "isActive">): AuthUser {
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    roles: user.roles as UserRole[],
    state: user.state,
    district: user.district,
    isDemo: user.isDemo,
    isActive: user.isActive,
  };
}

/** Returns the signed-in user or null. Never throws on missing/invalid session. */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  const payload = await verifySession(token);
  if (!payload) return null;

  await connectToDatabase();
  const user = await User.findById(payload.sub).lean<IUser | null>();
  if (!user || !user.isActive) return null;

  return sanitizeUser(user);
}

export function isAdmin(user: AuthUser | null): boolean {
  return Boolean(user?.roles.includes("admin"));
}

export async function requireUser(): Promise<AuthUser> {
  const user = await getCurrentUser();
  if (!user) throw ApiError.unauthorized();
  return user;
}

export async function requireRole(...allowed: UserRole[]): Promise<AuthUser> {
  const user = await requireUser();
  if (!user.roles.some((role) => allowed.includes(role))) {
    throw ApiError.forbidden();
  }
  return user;
}

export async function requireAdmin(): Promise<AuthUser> {
  return requireRole("admin");
}
