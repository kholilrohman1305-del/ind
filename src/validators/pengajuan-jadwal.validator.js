const { z } = require("zod");

/**
 * Schema untuk membuat pengajuan jadwal (edukator)
 */
const createPengajuanSchema = z.object({
  body: z.object({
    jadwal_id: z.coerce
      .number({ required_error: "Jadwal wajib dipilih." })
      .positive("Jadwal wajib dipilih."),
    tipe: z.enum(["reschedule", "cancel"], {
      errorMap: () => ({ message: "Tipe pengajuan harus 'reschedule' atau 'cancel'." }),
    }),
    alasan: z
      .string({ required_error: "Alasan wajib diisi." })
      .min(1, "Alasan wajib diisi."),
    tanggal_usulan: z.string().optional().nullable(),
    jam_mulai_usulan: z.string().optional().nullable(),
    jam_selesai_usulan: z.string().optional().nullable(),
  }).refine(
    (data) => {
      if (data.tipe === "reschedule") {
        return data.tanggal_usulan && data.jam_mulai_usulan && data.jam_selesai_usulan;
      }
      return true;
    },
    {
      message: "Reschedule memerlukan tanggal dan jam usulan.",
      path: ["tanggal_usulan"],
    }
  ),
});

/**
 * Schema untuk menyetujui pengajuan (admin)
 */
const approvePengajuanSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID pengajuan harus berupa angka positif."),
  }),
  body: z.object({
    catatan_admin: z.string().optional().nullable(),
  }),
});

/**
 * Schema untuk menolak pengajuan (admin)
 */
const rejectPengajuanSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID pengajuan harus berupa angka positif."),
  }),
  body: z.object({
    catatan_admin: z
      .string({ required_error: "Catatan wajib diisi saat menolak." })
      .min(1, "Catatan wajib diisi saat menolak."),
  }),
});

/**
 * Schema untuk membatalkan pengajuan (edukator)
 */
const cancelPengajuanSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID pengajuan harus berupa angka positif."),
  }),
});

module.exports = {
  createPengajuanSchema,
  approvePengajuanSchema,
  rejectPengajuanSchema,
  cancelPengajuanSchema,
};
