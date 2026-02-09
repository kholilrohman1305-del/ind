const { z } = require("zod");

/**
 * Schema untuk menyimpan setting tarif gaji
 */
const saveSettingSchema = z.object({
  body: z.object({
    nama_tarif: z
      .string({ required_error: "Nama tarif wajib diisi." })
      .min(1, "Nama tarif wajib diisi."),
    kategori_les: z.enum(["privat", "kelas"], {
      errorMap: () => ({ message: "Kategori les harus 'privat' atau 'kelas'." }),
    }),
    cabang_id: z.coerce.number().positive().optional().nullable(),
    // Dynamic fields: PAUD_TK_Mahasiswa, PAUD_TK_Sarjana, etc.
    // We allow passthrough for these dynamic keys
  }).passthrough(),
});

/**
 * Schema untuk menghapus tarif
 */
const deleteTarifQuerySchema = z.object({
  query: z.object({
    nama_tarif: z
      .string({ required_error: "Nama tarif wajib diisi." })
      .min(1, "Nama tarif wajib diisi."),
    kategori_les: z
      .string({ required_error: "Kategori les wajib diisi." })
      .min(1, "Kategori les wajib diisi."),
    cabang_id: z.coerce.number().positive().optional(),
  }),
});

/**
 * Schema untuk membuat infaq
 */
const createInfaqSchema = z.object({
  body: z.object({
    edukator_id: z.coerce
      .number({ required_error: "Edukator wajib dipilih." })
      .positive("Edukator wajib dipilih."),
    jenis_infaq: z
      .string({ required_error: "Jenis infaq wajib diisi." })
      .min(1, "Jenis infaq wajib diisi."),
    nominal: z.coerce
      .number({ required_error: "Nominal wajib diisi." })
      .positive("Nominal infaq harus lebih dari 0."),
    tanggal: z
      .string({ required_error: "Tanggal infaq wajib diisi." })
      .min(1, "Tanggal infaq wajib diisi."),
    keterangan: z.string().optional().nullable(),
    cabang_id: z.coerce.number().positive().optional().nullable(),
  }),
});

/**
 * Schema untuk membuat infaq massal
 */
const createInfaqMassalSchema = z.object({
  body: z.object({
    jenis_infaq: z
      .string({ required_error: "Jenis infaq wajib diisi." })
      .min(1, "Jenis infaq wajib diisi."),
    nominal: z.coerce
      .number({ required_error: "Nominal wajib diisi." })
      .positive("Nominal infaq harus lebih dari 0."),
    tanggal: z
      .string({ required_error: "Tanggal infaq wajib diisi." })
      .min(1, "Tanggal infaq wajib diisi."),
    keterangan: z.string().optional().nullable(),
    cabang_id: z.coerce.number().positive().optional().nullable(),
  }),
});

/**
 * Schema untuk update infaq
 */
const updateInfaqSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID infaq harus berupa angka positif."),
  }),
  body: z.object({
    jenis_infaq: z.string().min(1, "Jenis infaq tidak boleh kosong.").optional(),
    nominal: z.coerce.number().positive("Nominal harus lebih dari 0.").optional(),
    tanggal: z.string().optional(),
    keterangan: z.string().optional().nullable(),
    cabang_id: z.coerce.number().positive().optional().nullable(),
  }),
});

/**
 * Schema untuk cek anomali gaji
 */
const checkAnomaliesSchema = z.object({
  body: z.object({
    year: z.coerce.number().int().min(2000).max(2100).optional(),
    month: z.coerce.number().int().min(1).max(12).optional(),
    cabang_id: z.coerce.number().positive().optional().nullable(),
  }),
});

/**
 * Schema untuk update gaji manajemen
 */
const updateManajemenSalarySchema = z.object({
  body: z.object({
    id: z.coerce
      .number({ required_error: "ID manajemen wajib diisi." })
      .positive("ID manajemen wajib diisi."),
    gaji_tambahan: z.coerce.number().min(0, "Gaji tambahan tidak boleh negatif."),
    cabang_id: z.coerce.number().positive().optional().nullable(),
  }),
});

/**
 * Schema untuk assign manajemen ke edukator
 */
const assignManajemenSchema = z.object({
  body: z.object({
    edukator_id: z.coerce
      .number({ required_error: "Edukator wajib dipilih." })
      .positive("Edukator wajib dipilih."),
    manajemen_id: z.coerce.number().positive().optional().nullable(),
    cabang_id: z.coerce.number().positive().optional().nullable(),
  }),
});

/**
 * Schema untuk membuat tipe les
 */
const createTipeLesSchema = z.object({
  body: z.object({
    kode: z
      .string({ required_error: "Kode tipe les wajib diisi." })
      .min(1, "Kode tipe les wajib diisi."),
    nama: z
      .string({ required_error: "Nama tipe les wajib diisi." })
      .min(1, "Nama tipe les wajib diisi."),
    deskripsi: z.string().optional().nullable(),
    cabang_id: z.coerce.number().positive().optional().nullable(),
  }),
});

module.exports = {
  saveSettingSchema,
  deleteTarifQuerySchema,
  createInfaqSchema,
  createInfaqMassalSchema,
  updateInfaqSchema,
  checkAnomaliesSchema,
  updateManajemenSalarySchema,
  assignManajemenSchema,
  createTipeLesSchema,
};
