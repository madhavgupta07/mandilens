import bcrypt from "bcryptjs";
import crypto from "node:crypto";

const BCRYPT_ROUNDS = 10;

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export interface PasswordCheck {
  ok: boolean;
  problems: string[];
}

/** Simple, transparent strength policy (no external service required). */
export function validatePasswordStrength(password: string): PasswordCheck {
  const problems: string[] = [];
  if (password.length < 8) problems.push("Use at least 8 characters.");
  if (!/[a-z]/.test(password)) problems.push("Add a lowercase letter.");
  if (!/[A-Z]/.test(password)) problems.push("Add an uppercase letter.");
  if (!/[0-9]/.test(password)) problems.push("Add a digit.");
  return { ok: problems.length === 0, problems };
}

/** Opaque token for password reset links; only its hash is stored. */
export function generateResetToken(): { token: string; tokenHash: string; expiresAt: Date } {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: hashResetToken(token),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
  };
}

export function hashResetToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
