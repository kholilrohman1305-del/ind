const { z } = require("zod");

/**
 * Schema kehadiran siswa dalam presensi kelas
 */
const kehadiranItemSchema = z.object({
  siswaId: z.coerce.number().positive(),
  status: z.enum(["hadir", "tidak_hadir", "izin"], {
    errorMap: () => ({ message: "Status kehadiran harus 'hadir', 'tidak_hadir', atau 'izin'." }),
  }),
});

/**
 * Schema untuk mencatat presensi (absen oleh edukator)
 */
const absenSchema = z.object({
  params: z.object({
    jadwalId: z.coerce.number().positive("Jadwal ID harus berupa angka positif."),
  }),
  body: z.object({
    materi: z
      .string({ required_error: "Materi wajib diisi." })
      .min(1, "Materi wajib diisi."),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    kehadiran: z.array(kehadiranItemSchema).optional().nullable(),
  }),
});

/**
 * Schema untuk query list summary presensi
 */
const listSummaryQuerySchema = z.object({
  query: z.object({
    month: z
      .string()
      .regex(/^\d{4}-\d{2}$/, "Format bulan harus YYYY-MM.")
      .optional(),
    search: z.string().optional(),
    start_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
      .optional(),
    end_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Format tanggal harus YYYY-MM-DD.")
      .optional(),
  }),
});

/**
 * Schema untuk parameter detail presensi per edukator
 */
const listDetailParamSchema = z.object({
  params: z.object({
    edukatorId: z.coerce.number().positive("Edukator ID harus berupa angka positif."),
  }),
});

module.exports = {
  absenSchema,
  listSummaryQuerySchema,
  listDetailParamSchema,
};
