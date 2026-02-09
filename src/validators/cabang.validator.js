const { z } = require("zod");

/**
 * Schema untuk membuat cabang
 */
const createCabangSchema = z.object({
  body: z.object({
    kode: z
      .string({ required_error: "Kode cabang wajib diisi." })
      .min(1, "Kode cabang wajib diisi."),
    nama: z
      .string({ required_error: "Nama cabang wajib diisi." })
      .min(1, "Nama cabang wajib diisi."),
    alamat: z.string().optional().nullable(),
    telepon: z.string().optional().nullable(),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    tanggal_jatuh_tempo: z.coerce.number().int().min(1).max(31).optional(),
    is_active: z.any().optional(),
    admin_email: z.string().email("Format email admin tidak valid.").optional(),
    admin_password: z
      .string()
      .min(6, "Password admin minimal 6 karakter.")
      .optional(),
  }),
});

/**
 * Schema untuk mengupdate cabang
 */
const updateCabangSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID cabang harus berupa angka positif."),
  }),
  body: z.object({
    kode: z.string().min(1, "Kode cabang tidak boleh kosong.").optional(),
    nama: z.string().min(1, "Nama cabang tidak boleh kosong.").optional(),
    alamat: z.string().optional().nullable(),
    telepon: z.string().optional().nullable(),
    latitude: z.coerce.number().optional().nullable(),
    longitude: z.coerce.number().optional().nullable(),
    tanggal_jatuh_tempo: z.coerce.number().int().min(1).max(31).optional(),
    is_active: z.any().optional(),
    admin_email: z.string().email("Format email admin tidak valid.").optional(),
    admin_password: z
      .string()
      .min(6, "Password admin minimal 6 karakter.")
      .optional(),
  }),
});

module.exports = {
  createCabangSchema,
  updateCabangSchema,
};
