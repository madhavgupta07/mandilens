import { cookies } from "next/headers";
import type { AuthUser } from "./current-user";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "./session";

/** Sign a session for the user and attach the httpOnly cookie. */
export async function startSession(user: AuthUser): Promise<void> {
  const token = await signSession({
    sub: user.id,
    email: user.email,
    name: user.name,
    roles: user.roles,
  });
  const store = await cookies();
  store.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function endSession(): Promise<void> {
  const store = await cookies();
  store.set(SESSION_COOKIE, "", { ...sessionCookieOptions(), maxAge: 0 });
}
