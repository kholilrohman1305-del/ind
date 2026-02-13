const { ROLES } = require("./constants");

const menuMap = {
  [ROLES.SUPER_ADMIN]: [
    "dashboard",
    "cabang",
    "pemetaan-cabang",
    "mapel",
    "siswa",
    "edukator",
    "manajemen",
    "user-management",
    "analisis-sentimen",
    "analisa-cabang",
    "banner-management",
  ],
  [ROLES.ADMIN_CABANG]: [
    "dashboard",
    "siswa",
    "edukator",
    "program",
    "jadwal",
    "presensi",
    "pengajuan-jadwal",
    "tagihan",
    "manajemen",
    "pengeluaran",
    "penggajian",
    "laporan",
    "kas",
    "promo",
    "notifikasi",
    "setting",
    "analisis-sentimen",
  ],
  [ROLES.SISWA]: ["dashboard", "jadwal", "program-saya", "tagihan", "notifikasi", "feedback"],
  [ROLES.EDUKATOR]: ["dashboard", "jadwal", "presensi", "rekap-kehadiran", "rincian-gaji"],
};

const resolveHref = (role, key) => {
  if (role === ROLES.SUPER_ADMIN && key === "dashboard") {
    return "/dashboard-super";
  }
  if (role === ROLES.SUPER_ADMIN && key === "user-management") {
    return "/user-management";
  }
  if (role === ROLES.EDUKATOR) {
    if (key === "dashboard") return "/dashboard-edukator";
    if (key === "jadwal") return "/jadwal-edukator";
    if (key === "presensi") return "/presensi-edukator";
    if (key === "rekap-kehadiran") return "/rekap-presensi-edukator";
    if (key === "rincian-gaji") return "/rincian-gaji-edukator";
  }
  if (role === ROLES.SISWA) {
    if (key === "dashboard") return "/dashboard-siswa";
    if (key === "jadwal") return "/jadwal-siswa";
  }
  if (role === ROLES.ADMIN_CABANG || role === ROLES.SUPER_ADMIN) {
    if (key === "pengajuan-jadwal") return "/pengajuan-jadwal-admin";
  }
  if (key === "dashboard") return "/dashboard";
  if (key === "feedback") return "/feedback";
  if (key === "analisis-sentimen") return "/analisis-sentimen";
  return `/${key}`;
};

const getMenuByRole = (role) => menuMap[role] || [];

module.exports = {
  menuMap,
  getMenuByRole,
  resolveHref,
};
