const { z } = require("zod");

// ID opsional yang toleran: string kosong / null dianggap tidak diisi
// (menghindari error "expected number, received NaN" dari z.coerce).
const optionalId = z.preprocess(
  (value) => (value === "" || value === null || typeof value === "undefined" ? undefined : value),
  z.coerce.number().positive().optional()
);

/**
 * Schema slot jadwal privat
 */
const slotSchema = z.object({
  edukator_id: optionalId,
  mapel_id: optionalId,
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
      .number({ error: "Enrollment wajib dipilih." })
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
    kelas_id: optionalId,
    kelas_nama: z.string().optional().nullable(),
    program_ids: z.array(z.coerce.number().positive()).optional(),
    // Edukator utama boleh kosong jika setiap slot punya edukator sendiri
    // (divalidasi di service).
    edukator_id: optionalId,
    tanggal_mulai: z
      .string({ error: "Tanggal mulai wajib diisi." })
      .min(1, "Tanggal mulai wajib diisi."),
    tanggal_akhir: z
      .string({ error: "Tanggal akhir wajib diisi." })
      .min(1, "Tanggal akhir wajib diisi."),
    slots: z.array(
      z.object({
        // Hari boleh nama ("senin") atau angka (0-6); dua-duanya dipahami service.
        hari: z.union([
          z.coerce.number().int().min(0).max(6),
          z.string().min(1, "Hari jadwal wajib diisi."),
        ]),
        jam_mulai: z.string().min(1, "Jam mulai wajib diisi."),
        jam_selesai: z.string().min(1, "Jam selesai wajib diisi."),
        mapel_id: optionalId,
        edukator_id: optionalId,
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
