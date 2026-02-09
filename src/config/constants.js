const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN_CABANG: "admin_cabang",
  EDUKATOR: "edukator",
  SISWA: "siswa",
});

const ENROLLMENT_STATUS = Object.freeze({
  AKTIF: "aktif",
  SELESAI: "selesai",
  MENUNGGU_JADWAL: "menunggu_jadwal",
});

const JADWAL_STATUS = Object.freeze({
  SCHEDULED: "scheduled",
  COMPLETED: "completed",
});

const TAGIHAN_STATUS = Object.freeze({
  LUNAS: "lunas",
  CICILAN: "cicilan",
});

const PRESENSI_STATUS = Object.freeze({
  HADIR: "hadir",
  TIDAK_HADIR: "tidak_hadir",
  IZIN: "izin",
});

const TIPE_LES = Object.freeze({
  PRIVAT: "privat",
  KELAS: "kelas",
});

const PENDAFTARAN_STATUS = Object.freeze({
  PENDING: "pending",
  AKTIF: "aktif",
});

const PENGAJUAN_STATUS = Object.freeze({
  MENUNGGU: "menunggu",
  DISETUJUI: "disetujui",
  DITOLAK: "ditolak",
});

module.exports = {
  ROLES,
  ENROLLMENT_STATUS,
  JADWAL_STATUS,
  TAGIHAN_STATUS,
  PRESENSI_STATUS,
  TIPE_LES,
  PENDAFTARAN_STATUS,
  PENGAJUAN_STATUS,
};
