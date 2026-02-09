const { z } = require("zod");

/**
 * Schema untuk login
 */
const loginSchema = z.object({
  body: z.object({
    email: z
      .string({ required_error: "Email wajib diisi." })
      .min(1, "Email wajib diisi.")
      .email("Format email tidak valid."),
    password: z
      .string({ required_error: "Password wajib diisi." })
      .min(1, "Password wajib diisi."),
  }),
});

/**
 * Schema untuk registrasi siswa (public)
 */
const registerSiswaSchema = z.object({
  body: z.object({
    nama: z
      .string({ required_error: "Nama wajib diisi." })
      .min(1, "Nama wajib diisi."),
    email: z
      .string({ required_error: "Email wajib diisi." })
      .min(1, "Email wajib diisi.")
      .email("Format email tidak valid."),
    password: z
      .string({ required_error: "Password wajib diisi." })
      .min(6, "Password minimal 6 karakter."),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    cabang_id: z.coerce
      .number({ required_error: "Cabang wajib dipilih." })
      .positive("Cabang wajib dipilih."),
    jenjang: z.string().optional().nullable(),
    sekolah_asal: z.string().optional().nullable(),
    kelas: z.string().optional().nullable(),
    tanggal_lahir: z.string().optional().nullable(),
    program_id: z.coerce
      .number({ required_error: "Program wajib dipilih." })
      .positive("Program wajib dipilih."),
    mapel_ids: z.array(z.coerce.number().positive()).optional(),
    preferred_days: z
      .array(z.string().min(1))
      .min(1, "Pilih minimal satu hari belajar."),
    jam_belajar: z
      .string({ required_error: "Jam belajar wajib diisi." })
      .min(1, "Jam belajar wajib diisi."),
    tanggal_mulai_belajar: z
      .string({ required_error: "Tanggal mulai belajar wajib diisi." })
      .min(1, "Tanggal mulai belajar wajib diisi."),
  }),
});

/**
 * Schema untuk registrasi edukator (public)
 */
const registerEdukatorSchema = z.object({
  body: z.object({
    nama: z
      .string({ required_error: "Nama wajib diisi." })
      .min(1, "Nama wajib diisi."),
    email: z
      .string({ required_error: "Email wajib diisi." })
      .min(1, "Email wajib diisi.")
      .email("Format email tidak valid."),
    password: z
      .string({ required_error: "Password wajib diisi." })
      .min(6, "Password minimal 6 karakter."),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    cabang_id: z.coerce
      .number({ required_error: "Cabang wajib dipilih." })
      .positive("Cabang wajib dipilih."),
    pendidikan_terakhir: z.string().optional().nullable(),
    mapel_ids: z
      .array(z.coerce.number().positive())
      .optional(),
  }),
});

module.exports = {
  loginSchema,
  registerSiswaSchema,
  registerEdukatorSchema,
};
