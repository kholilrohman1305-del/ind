const { z } = require("zod");

/**
 * Schema untuk membuat feedback
 */
const createFeedbackSchema = z.object({
  body: z.object({
    program_id: z.coerce.number().positive().optional().nullable(),
    edukator_id: z.coerce.number().positive().optional().nullable(),
    jenis_feedback: z
      .string()
      .optional()
      .default("umum"),
    rating: z.coerce
      .number()
      .int()
      .min(1, "Rating minimal 1.")
      .max(5, "Rating maksimal 5.")
      .optional()
      .nullable(),
    komentar: z.string().optional().nullable(),
    aspek_penilaian: z
      .record(z.any())
      .optional()
      .nullable(),
  }),
});

/**
 * Schema untuk query feedback terbaru
 */
const recentFeedbackQuerySchema = z.object({
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).optional(),
    q: z.string().optional(),
    periode: z.string().optional(),
    cabang_id: z.coerce.number().positive().optional(),
  }),
});

module.exports = {
  createFeedbackSchema,
  recentFeedbackQuerySchema,
};
