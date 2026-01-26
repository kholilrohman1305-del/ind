const menuMap = {
  super_admin: [
    "dashboard",
    "cabang",
    "mapel",
    "siswa",
    "edukator",
    "manajemen",
    "pengeluaran",
    "user-management",
  ],
  admin_cabang: [
    "dashboard",
    "siswa",
    "edukator",
    "program",
    "jadwal",
    "presensi",
    "tagihan",
    "manajemen",
    "pengeluaran",
    "penggajian",
    "laporan",
    "kas",
    "promo",
    "notifikasi",
    "setting",
  ],
  siswa: ["dashboard", "jadwal", "tagihan", "notifikasi"],
  edukator: ["dashboard", "jadwal", "presensi"],
};

const resolveHref = (role, key) => {
  if (role === "super_admin" && key === "dashboard") {
    return "/dashboard-super";
  }
  if (role === "super_admin" && key === "user-management") {
    return "/user-management";
  }
  if (role === "edukator") {
    if (key === "dashboard") return "/dashboard-edukator";
    if (key === "jadwal") return "/jadwal-edukator";
    if (key === "presensi") return "/presensi-edukator";
  }
  if (role === "siswa") {
    if (key === "dashboard") return "/dashboard-siswa";
    if (key === "jadwal") return "/jadwal-siswa";
  }
  if (key === "dashboard") return "/dashboard";
  return `/${key}`;
};

const getMenuByRole = (role) => menuMap[role] || [];

module.exports = {
  menuMap,
  getMenuByRole,
  resolveHref,
};
