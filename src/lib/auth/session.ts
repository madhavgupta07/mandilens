import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();
export const SESSION_COOKIE = "mandilens_session";
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 days

export interface SessionPayload {
  sub: string;
  email: string;
  name: string;
  roles: string[];
}

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error(
      "AUTH_SECRET is missing or too short (minimum 32 characters). See .env.example.",
    );
  }
  return encoder.encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setIssuer("mandilens")
    .setAudience("mandilens-app")
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getSecret());
}

export async function verifySession(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret(), {
      issuer: "mandilens",
      audience: "mandilens-app",
    });
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      !Array.isArray(payload.roles)
    ) {
      return null;
    }
    return {
      sub: payload.sub,
      email: payload.email,
      name: typeof payload.name === "string" ? payload.name : payload.email,
      roles: payload.roles.filter((role): role is string => typeof role === "string"),
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
