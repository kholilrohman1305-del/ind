const { z } = require("zod");

/**
 * Schema untuk membuat edukator (admin)
 */
const createEdukatorSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email wajib diisi." })
      .min(1, "Email wajib diisi.")
      .email("Format email tidak valid."),
    password: z
      .string({ required_error: "Password wajib diisi." })
      .min(6, "Password minimal 6 karakter."),
    nama: z
      .string({ required_error: "Nama wajib diisi." })
      .min(1, "Nama wajib diisi."),
    cabang_utama_id: z.coerce.number().positive("Cabang wajib diisi.").optional(),
    mapel_ids: z
      .union([
        z.array(z.coerce.number().positive()),
        z.string().min(1),
      ])
      .refine(
        (val) => {
          if (Array.isArray(val)) return val.length > 0;
          return val.length > 0;
        },
        { message: "Mapel wajib dipilih." }
      ),
    nik: z.string().optional().nullable(),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    pendidikan_terakhir: z.string().optional().nullable(),
    foto: z.string().optional().nullable(),
    is_active: z.any().optional(),
  }),
});

/**
 * Schema untuk mengupdate edukator (admin)
 */
const updateEdukatorSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID edukator harus berupa angka positif."),
  }),
  body: z.object({
    email: z.string().email("Format email tidak valid.").optional(),
    password: z.string().min(6, "Password minimal 6 karakter.").optional(),
    nama: z.string().min(1, "Nama tidak boleh kosong.").optional(),
    cabang_utama_id: z.coerce.number().positive().optional(),
    mapel_ids: z
      .union([
        z.array(z.coerce.number().positive()),
        z.string().min(1),
      ])
      .optional(),
    nik: z.string().optional().nullable(),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    pendidikan_terakhir: z.string().optional().nullable(),
    foto: z.string().optional().nullable(),
    is_active: z.any().optional(),
  }),
});

/**
 * Schema untuk update profil edukator (self)
 */
const updateProfileEdukatorSchema = z.object({
  body: z.object({
    email: z.string().email("Format email tidak valid.").optional(),
    password: z.string().min(6, "Password minimal 6 karakter.").optional(),
    nama: z.string().min(1, "Nama tidak boleh kosong.").optional(),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    pendidikan_terakhir: z.string().optional().nullable(),
    foto: z.string().optional().nullable(),
  }),
});

module.exports = {
  createEdukatorSchema,
  updateEdukatorSchema,
  updateProfileEdukatorSchema,
};
