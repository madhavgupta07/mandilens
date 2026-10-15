import { z } from "zod";
import { USER_ROLES } from "@/lib/domain/constants";

const selfServiceRoles = ["farmer", "trader", "buyer"] as const;

export const registerSchema = z.object({
  name: z.string().min(2, "Enter your name.").max(120),
  email: z.string().email("Enter a valid email address.").max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
  role: z.enum(selfServiceRoles).default("trader"),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  phone: z
    .string()
    .max(20)
    .regex(/^[0-9()+\-\s]*$/, "Phone number contains unexpected characters.")
    .optional(),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(200),
  password: z.string().min(1, "Enter your password.").max(200),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email address.").max(200),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(10).max(200),
  password: z.string().min(8, "Use at least 8 characters.").max(200),
});

export const updateProfileSchema = z.object({
  name: z.string().min(2).max(120).optional(),
  state: z.string().max(80).optional(),
  district: z.string().max(80).optional(),
  bio: z.string().max(500).optional(),
  phone: z
    .string()
    .max(20)
    .regex(/^[0-9()+\-\s]*$/, "Phone number contains unexpected characters.")
    .optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const adminUserUpdateSchema = z.object({
  roles: z.array(z.enum(USER_ROLES)).min(1).optional(),
  isActive: z.boolean().optional(),
});
