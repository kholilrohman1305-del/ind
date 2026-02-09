const { z } = require("zod");

/**
 * Schema untuk parameter ID di URL (params.id)
 */
const idParamSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID harus berupa angka positif."),
  }),
});

/**
 * Schema untuk pagination query string
 */
const paginationQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    search: z.string().optional(),
  }),
});

/**
 * Schema untuk filter bulan (YYYY-MM) di query string
 */
const monthQuerySchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Format bulan harus YYYY-MM.")
      .optional(),
  }),
});

/**
 * Schema untuk filter tahun dan bulan terpisah
 */
const yearMonthQuerySchema = z.object({
  query: z.object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
  }),
});

/**
 * Schema untuk filter cabang di query string
 */
const cabangQuerySchema = z.object({
  query: z.object({
    cabang_id: z.coerce.number().positive().optional(),
  }),
});

module.exports = {
  idParamSchema,
  paginationQuerySchema,
  monthQuerySchema,
  yearMonthQuerySchema,
  cabangQuerySchema,
};
