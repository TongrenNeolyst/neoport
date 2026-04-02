import { z } from "zod";

export const knownReportTypes = [
  "company",
  "sector",
  "company_flash",
  "sector_flash",
  "common",
] as const;

export const reportStatuses = [
  "draft",
  "submitted",
  "published",
  "rejected",
] as const;

export const reportLanguages = ["zh", "en"] as const;
export const reportFileLabels = ["report", "model", "chief-approval"] as const;

export const reportStatusActions = [
  "submit",
  "approve",
  "reject",
  "reopen",
] as const;

const reportTypeSchema = z
  .string()
  .trim()
  .min(1, "Report type is required")
  .max(64, "Report type is too long");

const optionalShortText = z.string().trim().max(255, "Value too long").nullable().optional();
const optionalLongText = z.string().trim().max(35000, "Value too long").nullable().optional();

export const reportAnalystInputSchema = z.object({
  analyst_id: z.string().uuid("Analyst is required"),
  role: z.number().int().min(1).max(4),
  sort_order: z.number().int().min(1).max(4),
});

const reportAnalystsSchema = z
  .array(reportAnalystInputSchema)
  .max(4, "Maximum 4 analysts allowed")
  .superRefine((analysts, ctx) => {
    const analystIds = new Set(analysts.map((item) => item.analyst_id));
    if (analystIds.size !== analysts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Analysts must be unique",
      });
    }

    const orders = new Set(analysts.map((item) => item.sort_order));
    if (orders.size !== analysts.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Sort order must be unique",
      });
    }
  });

const reportEditableFieldsSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(300, "Title too long"),
  report_type: reportTypeSchema,
  ticker: optionalShortText,
  rating: optionalShortText,
  target_price: optionalShortText,
  region_code: z.string().max(10).nullable().optional(),
  sector_id: z.string().uuid().nullable().optional(),
  report_language: z.enum(reportLanguages).nullable().optional(),
  contact_person_id: z.string().uuid().nullable().optional(),
  investment_thesis: optionalLongText,
  certificate_confirmed: z.boolean().optional().default(false),
  coverage_id: z.string().uuid().nullable().optional(),
  analysts: reportAnalystsSchema.default([]),
  word_file_path: z.string().trim().min(1).nullable().optional(),
  word_file_name: z.string().trim().nullable().optional(),
  model_file_path: z.string().trim().min(1).nullable().optional(),
  model_file_name: z.string().trim().nullable().optional(),
});

export const reportCreateSchema = reportEditableFieldsSchema.omit({
  word_file_path: true,
  model_file_path: true,
});

export const reportSaveSchema = reportEditableFieldsSchema.extend({
  report_id: z.string().uuid("Report ID is required"),
});

export const reportSubmitSchema = z.object({
  report_id: z.string().uuid("Report ID is required"),
});

export const reportReviewActionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("approve"),
    report_id: z.string().uuid("Report ID is required"),
  }),
  z.object({
    action: z.literal("reject"),
    report_id: z.string().uuid("Report ID is required"),
    reason: z
      .string()
      .trim()
      .min(1, "Note is required")
      .max(1000, "Note too long"),
  }),
  z.object({
    action: z.literal("reopen"),
    report_id: z.string().uuid("Report ID is required"),
  }),
]);

export const reportDirectSubmitSchema = reportEditableFieldsSchema.extend({
  report_id: z.string().uuid().optional(),
});

export const reportDownloadSchema = z.object({
  report_id: z.string().uuid("Report ID is required"),
  file_path: z.string().trim().min(1, "File path is required"),
});

export type ReportType = string;
export type ReportStatus = (typeof reportStatuses)[number];
export type ReportLanguage = (typeof reportLanguages)[number];
export type ReportFileLabel = (typeof reportFileLabels)[number];
export type ReportStatusAction = (typeof reportStatusActions)[number];

export type ReportAnalystInput = z.infer<typeof reportAnalystInputSchema>;
export type ReportCreateInput = z.infer<typeof reportCreateSchema>;
export type ReportSaveInput = z.infer<typeof reportSaveSchema>;
export type ReportSubmitInput = z.infer<typeof reportSubmitSchema>;
export type ReportReviewActionInput = z.infer<typeof reportReviewActionSchema>;
export type ReportDirectSubmitInput = z.infer<typeof reportDirectSubmitSchema>;
export type ReportDownloadInput = z.infer<typeof reportDownloadSchema>;
