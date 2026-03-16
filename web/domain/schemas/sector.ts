import { z } from "zod";

export const sectorSchema = z.object({
  level: z.literal(1).or(z.literal(2)),
  name_en: z.string().min(1, "English name is required").max(200, "English name too long"),
  name_cn: z.string().max(200, "Chinese name too long").optional().nullable(),
  wind_name: z.string().max(200, "Wind name too long").optional().nullable(),
  parent_id: z.string().uuid().optional().nullable(),
});

export const sectorUpdateSchema = sectorSchema.partial().extend({
  is_active: z.boolean().optional(),
});

export type SectorInput = z.infer<typeof sectorSchema>;
export type SectorUpdateInput = z.infer<typeof sectorUpdateSchema>;
