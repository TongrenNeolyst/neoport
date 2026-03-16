import { z } from "zod";

export const analystSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(200, "Full name too long"),
  chinese_name: z.string().max(100, "Chinese name too long").optional(),
  email: z.string().email("Invalid email address"),
  region_code: z.string().max(10, "Region code is required"),
  suffix: z.string().max(50, "Suffix too long").optional(),
  sfc: z.string().max(50, "SFC too long").optional(),
  is_active: z.boolean().optional(),
});

export const analystUpdateSchema = analystSchema.partial();

// Create schema with required fields
export const analystCreateSchema = analystSchema.pick({
  full_name: true,
  chinese_name: true,
  email: true,
  region_code: true,
  suffix: true,
  sfc: true,
});
