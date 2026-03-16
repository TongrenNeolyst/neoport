import { z } from "zod";

import { emailSchema } from "./auth";

export { emailSchema };

export const userRoleSchema = z.enum(["admin", "sa", "analyst"]);
export type UserRole = z.infer<typeof userRoleSchema>;

export const inviteUserSchema = z.object({
  email: emailSchema,
  fullName: z.string().min(1, "Name is required."),
  role: userRoleSchema,
  requireEmailConfirmation: z.boolean().optional().default(true),
});

export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z.object({
  id: z.string().min(1, "Invalid user."),
  email: emailSchema,
  fullName: z.string().min(1, "Name is required."),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const setUserRoleSchema = z.object({
  id: z.string().min(1, "Invalid user."),
  role: userRoleSchema,
});

export type SetUserRoleInput = z.infer<typeof setUserRoleSchema>;

export const setUserBannedSchema = z.object({
  id: z.string().min(1, "Invalid user."),
  banned: z.boolean(),
});

export type SetUserBannedInput = z.infer<typeof setUserBannedSchema>;

export const resetUserPasswordSchema = z.object({
  id: z.string().min(1, "Invalid user."),
  newPassword: z.string().min(1, "Password is required."),
});

export type ResetUserPasswordInput = z.infer<typeof resetUserPasswordSchema>;

export const deleteUserSchema = z.object({
  id: z.string().min(1, "Invalid user."),
});

export type DeleteUserInput = z.infer<typeof deleteUserSchema>;
