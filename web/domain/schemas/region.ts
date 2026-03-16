import { z } from "zod";

export const regionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  code: z.string().min(1, "Code is required").max(10, "Code too long"),
});

export const regionUpdateSchema = regionSchema.partial();
