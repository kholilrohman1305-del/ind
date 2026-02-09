window.APP_CONSTANTS = Object.freeze({
  ROLES: Object.freeze({
    SUPER_ADMIN: "super_admin",
    ADMIN_CABANG: "admin_cabang",
    EDUKATOR: "edukator",
    SISWA: "siswa",
  }),
  ENROLLMENT_STATUS: Object.freeze({
    AKTIF: "aktif",
    SELESAI: "selesai",
    MENUNGGU_JADWAL: "menunggu_jadwal",
  }),
  JADWAL_STATUS: Object.freeze({
    SCHEDULED: "scheduled",
    COMPLETED: "completed",
  }),
  TAGIHAN_STATUS: Object.freeze({
    LUNAS: "lunas",
    CICILAN: "cicilan",
  }),
  PRESENSI_STATUS: Object.freeze({
    HADIR: "hadir",
    TIDAK_HADIR: "tidak_hadir",
    IZIN: "izin",
  }),
  TIPE_LES: Object.freeze({
    PRIVAT: "privat",
    KELAS: "kelas",
  }),
  PENDAFTARAN_STATUS: Object.freeze({
    PENDING: "pending",
    AKTIF: "aktif",
  }),
  PENGAJUAN_STATUS: Object.freeze({
    MENUNGGU: "menunggu",
    DISETUJUI: "disetujui",
    DITOLAK: "ditolak",
  }),
});
