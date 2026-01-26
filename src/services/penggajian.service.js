const db = require("../db");

const JENJANGS = ["PAUD_TK", "SD", "SMP", "SMA", "ALUMNI"];

const normalizeJenjang = (value) => {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  if (upper.includes("PAUD") || upper.includes("TK")) return "PAUD_TK";
  if (upper.includes("SD") || upper.includes("SEKOLAH DASAR")) return "SD";
  if (upper.includes("SMP") || upper.includes("TSANAWIYAH")) return "SMP";
  if (upper.includes("SMA") || upper.includes("SMK") || upper.includes("ALIYAH")) return "SMA";
  if (upper.includes("ALUMNI")) return "ALUMNI";
  return null;
};

const listSetting = async (cabangId) => {
  const params = [];
  let where = "";
  if (cabangId) {
    where = "WHERE cabang_id = ?";
    params.push(cabangId);
  } else {
    where = "WHERE cabang_id IS NULL";
  }
  const [rows] = await db.query(
    `SELECT jenjang, nominal, updated_at
     FROM gaji_setting
     ${where}
     ORDER BY FIELD(jenjang, 'PAUD_TK', 'SD', 'SMP', 'SMA', 'ALUMNI')`,
    params
  );
  return rows;
};

const saveSetting = async (payload, cabangId) => {
  const values = [];
  JENJANGS.forEach((jenjang) => {
    const key = jenjang.toLowerCase();
    const nominalRaw = payload[key];
    const nominal = Number(nominalRaw || 0);
    values.push([cabangId || null, jenjang, Number.isFinite(nominal) ? nominal : 0]);
  });

  await db.query(
    `INSERT INTO gaji_setting (cabang_id, jenjang, nominal)
     VALUES ?
     ON DUPLICATE KEY UPDATE nominal = VALUES(nominal), updated_at = CURRENT_TIMESTAMP`,
    [values]
  );

  return listSetting(cabangId);
};

const getJenjangFromJadwal = async (connection, jadwal) => {
  if (jadwal.enrollment_id) {
    const [rows] = await connection.query(
      `SELECT s.kelas
       FROM enrollment en
       JOIN siswa s ON s.id = en.siswa_id
       WHERE en.id = ? LIMIT 1`,
      [jadwal.enrollment_id]
    );
    return normalizeJenjang(rows[0]?.kelas);
  }

  const [rows] = await connection.query(
    `SELECT s.kelas
     FROM jadwal_kelas_siswa jks
     JOIN enrollment en ON en.id = jks.enrollment_id
     JOIN siswa s ON s.id = en.siswa_id
     WHERE jks.jadwal_id = ?
     ORDER BY jks.id ASC
     LIMIT 1`,
    [jadwal.id]
  );
  return normalizeJenjang(rows[0]?.kelas);
};

const getSettingNominal = async (connection, cabangId, jenjang) => {
  if (!jenjang) return 0;
  const [rows] = await connection.query(
    `SELECT nominal
     FROM gaji_setting
     WHERE cabang_id <=> ? AND jenjang = ?
     LIMIT 1`,
    [cabangId || null, jenjang]
  );
  return Number(rows[0]?.nominal || 0);
};

const getManajemenBonus = async (connection, edukatorId) => {
  if (!edukatorId) return 0;
  const [rows] = await connection.query(
    `SELECT m.gaji_tambahan
     FROM edukator e
     JOIN manajemen m ON m.id = e.manajemen_id
     WHERE e.id = ?
     LIMIT 1`,
    [edukatorId]
  );
  return Number(rows[0]?.gaji_tambahan || 0);
};

const createTransaksiFromPresensi = async (connection, presensiId, jadwal, cabangId) => {
  const jenjang = await getJenjangFromJadwal(connection, jadwal);
  const nominal = await getSettingNominal(connection, cabangId, jenjang);
  if (!jenjang) {
    return { jenjang: null, nominal: 0 };
  }

  await connection.query(
    `INSERT IGNORE INTO gaji_transaksi
      (presensi_id, jadwal_id, edukator_id, cabang_id, jenjang, nominal)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [presensiId, jadwal.id, jadwal.edukator_id, cabangId || null, jenjang, Number(nominal)]
  );

  return { jenjang, nominal: Number(nominal) };
};

const listSlip = async ({ cabangId, edukatorId, year, month }) => {
  const targetYear = Number(year || new Date().getFullYear());
  const targetMonth = Number(month || new Date().getMonth() + 1);
  const whereParams = [];
  let where = "WHERE e.is_active = 1";
  if (cabangId) {
    where += " AND e.cabang_utama_id = ?";
    whereParams.push(cabangId);
  }
  if (edukatorId) {
    where += " AND e.id = ?";
    whereParams.push(edukatorId);
  }

  const [rows] = await db.query(
    `SELECT e.id AS edukator_id, e.nama AS edukator_nama,
            ? AS tahun,
            ? AS bulan,
            COALESCE(SUM(CASE WHEN j.tipe_les = 'privat' THEN gt.nominal ELSE 0 END), 0) AS gaji_privat,
            COALESCE(SUM(CASE WHEN j.tipe_les = 'kelas' THEN gt.nominal ELSE 0 END), 0) AS gaji_kelas,
            COALESCE(m.gaji_tambahan, 0) AS gaji_manajemen,
            COALESCE(SUM(gt.nominal), 0) + COALESCE(m.gaji_tambahan, 0) AS total_gaji
     FROM edukator e
     LEFT JOIN gaji_transaksi gt
       ON gt.edukator_id = e.id
      AND YEAR(gt.created_at) = ?
      AND MONTH(gt.created_at) = ?
     LEFT JOIN jadwal j ON j.id = gt.jadwal_id
     LEFT JOIN manajemen m ON m.id = e.manajemen_id
     ${where}
     GROUP BY e.id, e.nama, m.gaji_tambahan
     ORDER BY e.nama ASC`,
    [targetYear, targetMonth, targetYear, targetMonth, ...whereParams]
  );
  return rows;
};

module.exports = {
  listSetting,
  saveSetting,
  listSlip,
  createTransaksiFromPresensi,
  normalizeJenjang,
  getManajemenBonus,
};
