const { z } = require("zod");

/**
 * Schema untuk membuat catatan siswa
 */
const createCatatanSchema = z.object({
  body: z.object({
    siswa_id: z.coerce
      .number({ required_error: "Siswa wajib dipilih." })
      .positive("Siswa wajib dipilih."),
    tanggal: z
      .string({ required_error: "Tanggal wajib diisi." })
      .min(1, "Tanggal wajib diisi."),
    catatan: z
      .string({ required_error: "Catatan wajib diisi." })
      .min(1, "Catatan wajib diisi."),
    kategori: z.string().optional().nullable(),
  }),
});

/**
 * Schema untuk mengupdate catatan siswa
 */
const updateCatatanSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID catatan harus berupa angka positif."),
  }),
  body: z.object({
    catatan: z
      .string({ required_error: "Catatan wajib diisi." })
      .min(1, "Catatan wajib diisi."),
    kategori: z.string().optional().nullable(),
  }),
});

/**
 * Schema untuk parameter siswaId pada list notes
 */
const siswaIdParamSchema = z.object({
  params: z.object({
    siswaId: z.coerce.number().positive("Siswa ID harus berupa angka positif."),
  }),
});

module.exports = {
  createCatatanSchema,
  updateCatatanSchema,
  siswaIdParamSchema,
};
