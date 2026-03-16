import { z } from "zod";

export const coverageAnalystInputSchema = z.object({
  analyst_id: z.string().uuid("Analyst is required"),
  role: z.number().int().min(1).max(4),
  sort_order: z.number().int().min(1).max(4),
});

const coverageAnalystsSchema = z
  .array(coverageAnalystInputSchema)
  .min(1, "At least one analyst is required")
  .max(4, "Maximum 4 analysts allowed")
  .superRefine((analysts, ctx) => {
    const uniqueIds = new Set(analysts.map((item) => item.analyst_id));
    if (uniqueIds.size !== analysts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Analysts must be unique",
      });
    }
  });

export const coverageSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(50, "Ticker too long"),
  country_of_domicile: z.string().min(1, "Country of domicile is required").max(100, "Country too long"),
  english_full_name: z.string().min(1, "English name is required").max(500, "English name too long"),
  chinese_short_name: z.string().max(200, "Chinese name too long").optional().nullable(),
  traditional_chinese: z.string().max(200, "Traditional Chinese too long").optional().nullable(),
  sector_id: z.string().uuid("Sector is required"),
  isin: z.string().min(1, "ISIN is required").max(50, "ISIN too long"),
  reporting_currency: z.string().max(20, "Currency too long").optional().nullable(),
  ads_conversion_factor: z.number().positive("ADS conversion factor must be positive").optional().nullable(),
  analysts: coverageAnalystsSchema,
});

export const coverageUpdateSchema = z.object({
  ticker: z.string().min(1, "Ticker is required").max(50, "Ticker too long").optional(),
  country_of_domicile: z.string().min(1, "Country of domicile is required").max(100, "Country too long").optional(),
  english_full_name: z.string().min(1, "English name is required").max(500, "English name too long").optional(),
  chinese_short_name: z.string().max(200, "Chinese name too long").optional().nullable(),
  traditional_chinese: z.string().max(200, "Traditional Chinese too long").optional().nullable(),
  sector_id: z.string().uuid("Sector is required").optional(),
  isin: z.string().min(1, "ISIN is required").max(50, "ISIN too long").optional(),
  reporting_currency: z.string().max(20, "Currency too long").optional().nullable(),
  ads_conversion_factor: z.number().positive("ADS conversion factor must be positive").optional().nullable(),
  is_active: z.boolean().optional(),
  analysts: coverageAnalystsSchema.optional(),
});

export type CoverageAnalystInput = z.infer<typeof coverageAnalystInputSchema>;
export type CoverageInput = z.infer<typeof coverageSchema>;
export type CoverageUpdateInput = z.infer<typeof coverageUpdateSchema>;
