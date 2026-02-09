const { z } = require("zod");

/**
 * Schema slot jadwal privat
 */
const slotSchema = z.object({
  edukator_id: z.coerce.number().positive().optional().nullable(),
  mapel_id: z.coerce.number().positive().optional().nullable(),
  tanggal: z.string().optional().nullable(),
  jam_mulai: z.string().optional().nullable(),
  jam_selesai: z.string().optional().nullable(),
});

/**
 * Schema untuk membuat jadwal privat
 */
const createPrivatJadwalSchema = z.object({
  body: z.object({
    enrollment_id: z.coerce
      .number({ required_error: "Enrollment wajib dipilih." })
      .positive("Enrollment wajib dipilih."),
    slots: z
      .array(slotSchema)
      .min(1, "Slot jadwal wajib diisi."),
  }),
});

/**
 * Schema untuk membuat jadwal kelas
 */
const createKelasJadwalSchema = z.object({
  body: z.object({
    kelas_id: z.coerce.number().positive().optional().nullable(),
    kelas_nama: z.string().optional(),
    program_ids: z.array(z.coerce.number().positive()).optional(),
    edukator_id: z.coerce
      .number({ required_error: "Edukator wajib dipilih." })
      .positive("Edukator wajib dipilih."),
    tanggal_mulai: z
      .string({ required_error: "Tanggal mulai wajib diisi." })
      .min(1, "Tanggal mulai wajib diisi."),
    tanggal_akhir: z
      .string({ required_error: "Tanggal akhir wajib diisi." })
      .min(1, "Tanggal akhir wajib diisi."),
    slots: z.array(
      z.object({
        hari: z.coerce.number().int().min(0).max(6),
        jam_mulai: z.string().min(1, "Jam mulai wajib diisi."),
        jam_selesai: z.string().min(1, "Jam selesai wajib diisi."),
        mapel_id: z.coerce.number().positive().optional().nullable(),
      })
    ).optional(),
  }),
});

/**
 * Schema untuk mengupdate jadwal
 */
const updateJadwalSchema = z.object({
  params: z.object({
    id: z.coerce.number().positive("ID jadwal harus berupa angka positif."),
  }),
  body: z.object({
    tanggal: z.string().optional(),
    jam_mulai: z.string().optional(),
    jam_selesai: z.string().optional(),
    edukator_id: z.coerce.number().positive("Edukator wajib dipilih.").optional(),
    mapel_id: z.coerce.number().positive("Mapel wajib dipilih.").optional(),
  }),
});

/**
 * Schema untuk parameter enrollmentId
 */
const enrollmentIdParamSchema = z.object({
  params: z.object({
    enrollmentId: z.coerce.number().positive("Enrollment ID harus berupa angka positif."),
  }),
});

/**
 * Schema untuk parameter kelasId
 */
const kelasIdParamSchema = z.object({
  params: z.object({
    kelasId: z.coerce.number().positive("Kelas ID harus berupa angka positif."),
  }),
});

module.exports = {
  createPrivatJadwalSchema,
  createKelasJadwalSchema,
  updateJadwalSchema,
  enrollmentIdParamSchema,
  kelasIdParamSchema,
};
