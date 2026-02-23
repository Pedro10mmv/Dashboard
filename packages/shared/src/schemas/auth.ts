import { z } from "zod";

// ─── Auth ────────────────────────────────────────────────────────
export const RegisterSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(1).max(100),
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const AuthTokenPayload = z.object({
  userId: z.string(),
  email: z.string().email(),
});
export type AuthTokenPayload = z.infer<typeof AuthTokenPayload>;
