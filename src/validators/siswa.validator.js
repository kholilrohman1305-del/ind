const { z } = require("zod");

/**
 * Schema untuk membuat siswa (admin)
 */
const createSiswaSchema = z.object({
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
    cabang_id: z.coerce.number().positive("Cabang wajib diisi.").optional(),
    program_id: z.coerce
      .number({ required_error: "Program wajib dipilih." })
      .positive("Program wajib dipilih."),
    edukator_id: z.coerce.number().positive().optional().nullable(),
    nik: z.string().optional().nullable(),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    tanggal_lahir: z.string().optional().nullable(),
    sekolah_asal: z.string().optional().nullable(),
    jenjang: z.string().optional().nullable(),
    kelas: z.string().optional().nullable(),
    foto: z.string().optional().nullable(),
    is_active: z.any().optional(),
    mapel_ids: z.array(z.coerce.number().positive()).optional(),
  }),
});

/**
 * Schema untuk mengupdate siswa (admin)
 */
const updateSiswaSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID siswa harus berupa angka positif."),
  }),
  body: z.object({
    email: z.string().email("Format email tidak valid.").optional(),
    password: z.string().min(6, "Password minimal 6 karakter.").optional(),
    nama: z.string().min(1, "Nama tidak boleh kosong.").optional(),
    program_id: z.coerce.number().positive().optional(),
    start_date: z.string().optional().nullable(),
    edukator_id: z.coerce.number().positive().optional().nullable(),
    nik: z.string().optional().nullable(),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    tanggal_lahir: z.string().optional().nullable(),
    sekolah_asal: z.string().optional().nullable(),
    jenjang: z.string().optional().nullable(),
    kelas: z.string().optional().nullable(),
    foto: z.string().optional().nullable(),
    is_active: z.any().optional(),
    mapel_ids: z.array(z.coerce.number().positive()).optional(),
  }),
});

/**
 * Schema untuk perpanjangan program siswa
 */
const renewSiswaSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID siswa harus berupa angka positif."),
  }),
  body: z.object({
    program_id: z.coerce.number().positive().optional().nullable(),
    start_date: z.string().optional().nullable(),
  }),
});

/**
 * Schema untuk update profil siswa (self)
 */
const updateProfileSiswaSchema = z.object({
  body: z.object({
    email: z.string().email("Format email tidak valid.").optional(),
    password: z.string().min(6, "Password minimal 6 karakter.").optional(),
    nama: z.string().min(1, "Nama tidak boleh kosong.").optional(),
    telepon: z.string().optional().nullable(),
    alamat: z.string().optional().nullable(),
    sekolah_asal: z.string().optional().nullable(),
    tanggal_lahir: z.string().optional().nullable(),
    jenjang: z.string().optional().nullable(),
    kelas: z.string().optional().nullable(),
    foto: z.string().optional().nullable(),
  }),
});

module.exports = {
  createSiswaSchema,
  updateSiswaSchema,
  renewSiswaSchema,
  updateProfileSiswaSchema,
};
