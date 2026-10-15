import { connectToDatabase } from "@/lib/db/connect";
import { User } from "@/lib/db/models";
import { ApiError } from "@/lib/api/response";
import { sanitizeUser, type AuthUser } from "@/lib/auth/current-user";
import {
  generateResetToken,
  hashPassword,
  hashResetToken,
  validatePasswordStrength,
  verifyPassword,
} from "@/lib/auth/password";
import type { RegisterInput, UpdateProfileInput } from "@/lib/validation/auth";
import type { UserRole } from "@/lib/domain/constants";

export async function registerUser(input: RegisterInput): Promise<AuthUser> {
  await connectToDatabase();

  const email = input.email.trim().toLowerCase();
  const existing = await User.findOne({ email }).select("_id").lean();
  if (existing) {
    throw ApiError.conflict("An account with that email already exists. Try signing in.");
  }

  const strength = validatePasswordStrength(input.password);
  if (!strength.ok) {
    throw ApiError.unprocessable("Please choose a stronger password.", strength.problems);
  }

  const passwordHash = await hashPassword(input.password);
  const user = await User.create({
    name: input.name.trim(),
    email,
    passwordHash,
    roles: [input.role as UserRole],
    state: input.state,
    district: input.district,
    phone: input.phone,
    emailVerified: false,
    isActive: true,
    isDemo: false,
  });

  return sanitizeUser(user.toObject());
}

export interface AuthenticateResult {
  user: AuthUser;
  passwordHash: string;
}

export async function authenticate(email: string, password: string): Promise<AuthUser> {
  await connectToDatabase();
  const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+passwordHash");
  if (!user) {
    throw ApiError.unauthorized("Email or password is incorrect.");
  }

  const ok = await verifyPassword(password, user.passwordHash);
  if (!ok) {
    throw ApiError.unauthorized("Email or password is incorrect.");
  }

  if (!user.isActive) {
    throw ApiError.forbidden("This account has been deactivated. Contact an administrator.");
  }

  user.lastLoginAt = new Date();
  await user.save();

  return sanitizeUser(user.toObject());
}

export interface PasswordResetRequest {
  requested: true;
  /** Present only when no email provider is configured and not in production. */
  devToken?: string;
  devResetUrl?: string;
}

/**
 * Start a password reset. The response is identical whether or not the email
 * exists, so accounts cannot be enumerated. Without a configured email provider
 * the token is returned only in non-production environments (clearly labelled).
 */
export async function initiatePasswordReset(email: string): Promise<PasswordResetRequest> {
  await connectToDatabase();
  const user = await User.findOne({ email: email.trim().toLowerCase() });
  if (!user) {
    return { requested: true };
  }

  const { token, tokenHash, expiresAt } = generateResetToken();
  user.passwordResetTokenHash = tokenHash;
  user.passwordResetExpiresAt = expiresAt;
  await user.save();

  const emailConfigured = Boolean(process.env.EMAIL_PROVIDER_API_KEY);
  if (!emailConfigured && process.env.NODE_ENV !== "production") {
    const base = process.env.APP_URL || "http://localhost:3000";
    return {
      requested: true,
      devToken: token,
      devResetUrl: `${base}/reset-password?token=${token}`,
    };
  }

  // Email delivery would happen here when EMAIL_PROVIDER_API_KEY is configured.
  return { requested: true };
}

export async function resetPassword(token: string, password: string): Promise<void> {
  await connectToDatabase();
  const strength = validatePasswordStrength(password);
  if (!strength.ok) {
    throw ApiError.unprocessable("Please choose a stronger password.", strength.problems);
  }

  const tokenHash = hashResetToken(token);
  const user = await User.findOne({
    passwordResetTokenHash: tokenHash,
    passwordResetExpiresAt: { $gt: new Date() },
  });
  if (!user) {
    throw ApiError.badRequest("This reset link is invalid or has expired. Request a new one.");
  }

  user.passwordHash = await hashPassword(password);
  user.passwordResetTokenHash = undefined;
  user.passwordResetExpiresAt = undefined;
  await user.save();
}

export async function updateProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<AuthUser> {
  await connectToDatabase();
  const user = await User.findById(userId).select("+phone");
  if (!user) throw ApiError.notFound("Account not found.");

  if (input.name !== undefined) user.name = input.name;
  if (input.state !== undefined) user.state = input.state;
  if (input.district !== undefined) user.district = input.district;
  if (input.bio !== undefined) user.bio = input.bio;
  if (input.phone !== undefined) user.phone = input.phone;

  await user.save();
  return sanitizeUser(user.toObject());
}

export async function changePassword(
  userId: string,
  currentPassword: string,
  newPassword: string,
): Promise<void> {
  await connectToDatabase();
  const user = await User.findById(userId).select("+passwordHash");
  if (!user) throw ApiError.notFound("Account not found.");

  const ok = await verifyPassword(currentPassword, user.passwordHash);
  if (!ok) throw ApiError.badRequest("Your current password is incorrect.");

  const strength = validatePasswordStrength(newPassword);
  if (!strength.ok) {
    throw ApiError.unprocessable("Please choose a stronger password.", strength.problems);
  }

  user.passwordHash = await hashPassword(newPassword);
  await user.save();
}
