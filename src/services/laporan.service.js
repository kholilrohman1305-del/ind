const db = require("../db");

const WEEK_LABELS = ["Minggu 1", "Minggu 2", "Minggu 3", "Minggu 4", "Minggu 5"];
const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
];

const buildWeekCase = (column) =>
  `CASE
     WHEN DAY(${column}) BETWEEN 1 AND 7 THEN 1
     WHEN DAY(${column}) BETWEEN 8 AND 14 THEN 2
     WHEN DAY(${column}) BETWEEN 15 AND 21 THEN 3
     WHEN DAY(${column}) BETWEEN 22 AND 28 THEN 4
     ELSE 5
   END`;

const getKeuanganBulanan = async ({ cabangId, year, month }) => {
  const params = [year, month];
  const cabangFilter = cabangId ? " AND cabang_id = ?" : "";
  if (cabangId) params.push(cabangId);

  const tagihanWeek = buildWeekCase("tanggal_jatuh_tempo");
  const pembayaranWeek = buildWeekCase("tanggal_bayar");
  const pengeluaranWeek = buildWeekCase("tanggal");
  const gajiWeek = buildWeekCase("created_at");

  const [tagihanRows] = await db.query(
    `SELECT ${tagihanWeek} AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM tagihan
     WHERE YEAR(tanggal_jatuh_tempo) = ? AND MONTH(tanggal_jatuh_tempo) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [pembayaranRows] = await db.query(
    `SELECT ${pembayaranWeek} AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM pembayaran
     WHERE YEAR(tanggal_bayar) = ? AND MONTH(tanggal_bayar) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [pengeluaranRows] = await db.query(
    `SELECT ${pengeluaranWeek} AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM pengeluaran
     WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [gajiRows] = await db.query(
    `SELECT ${gajiWeek} AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM gaji_transaksi
     WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [gajiManajemenRows] = await db.query(
    `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
     FROM edukator e
     JOIN manajemen m ON m.id = e.manajemen_id
     WHERE e.is_active = 1${cabangId ? " AND e.cabang_utama_id = ?" : ""}`,
    cabangId ? [cabangId] : []
  );

  const sumByBucket = (rows) =>
    rows.reduce((acc, row) => {
      acc[row.bucket] = Number(row.total || 0);
      return acc;
    }, {});

  const tagihanMap = sumByBucket(tagihanRows);
  const pembayaranMap = sumByBucket(pembayaranRows);
  const pengeluaranMap = sumByBucket(pengeluaranRows);
  const gajiMap = sumByBucket(gajiRows);
  const gajiManajemenTotal = Number(gajiManajemenRows[0]?.total || 0);

  const pemasukan = WEEK_LABELS.map((_, index) => {
    const key = index + 1;
    return Number(tagihanMap[key] || 0) + Number(pembayaranMap[key] || 0);
  });

  const perWeekManajemen = gajiManajemenTotal / WEEK_LABELS.length;
  const pengeluaran = WEEK_LABELS.map((_, index) => {
    const key = index + 1;
    return (
      Number(pengeluaranMap[key] || 0) +
      Number(gajiMap[key] || 0) +
      perWeekManajemen
    );
  });

  return {
    labels: WEEK_LABELS,
    datasets: { pemasukan, pengeluaran },
  };
};

const getKeuanganTahunan = async ({ cabangId, year }) => {
  const params = [year];
  const cabangFilter = cabangId ? " AND cabang_id = ?" : "";
  if (cabangId) params.push(cabangId);

  const [tagihanRows] = await db.query(
    `SELECT MONTH(tanggal_jatuh_tempo) AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM tagihan
     WHERE YEAR(tanggal_jatuh_tempo) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [pembayaranRows] = await db.query(
    `SELECT MONTH(tanggal_bayar) AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM pembayaran
     WHERE YEAR(tanggal_bayar) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [pengeluaranRows] = await db.query(
    `SELECT MONTH(tanggal) AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM pengeluaran
     WHERE YEAR(tanggal) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [gajiRows] = await db.query(
    `SELECT MONTH(created_at) AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM gaji_transaksi
     WHERE YEAR(created_at) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  const [gajiManajemenRows] = await db.query(
    `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
     FROM edukator e
     JOIN manajemen m ON m.id = e.manajemen_id
     WHERE e.is_active = 1${cabangId ? " AND e.cabang_utama_id = ?" : ""}`,
    cabangId ? [cabangId] : []
  );

  const sumByBucket = (rows) =>
    rows.reduce((acc, row) => {
      acc[row.bucket] = Number(row.total || 0);
      return acc;
    }, {});

  const tagihanMap = sumByBucket(tagihanRows);
  const pembayaranMap = sumByBucket(pembayaranRows);
  const pengeluaranMap = sumByBucket(pengeluaranRows);
  const gajiMap = sumByBucket(gajiRows);
  const gajiManajemenTotal = Number(gajiManajemenRows[0]?.total || 0);

  const pemasukan = MONTH_LABELS.map((_, index) => {
    const key = index + 1;
    return Number(tagihanMap[key] || 0) + Number(pembayaranMap[key] || 0);
  });

  const pengeluaran = MONTH_LABELS.map((_, index) => {
    const key = index + 1;
    return (
      Number(pengeluaranMap[key] || 0) +
      Number(gajiMap[key] || 0) +
      gajiManajemenTotal
    );
  });

  return {
    labels: MONTH_LABELS,
    datasets: { pemasukan, pengeluaran },
  };
};

const getLanjutanSummary = async ({ cabangId, year, month }) => {
  const targetYear = Number(year || new Date().getFullYear());
  const targetMonth = Number(month || new Date().getMonth() + 1);

  const [[presensiRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM presensi p
     JOIN jadwal j ON j.id = p.jadwal_id
     WHERE j.cabang_id = ? AND YEAR(p.waktu_absen) = ? AND MONTH(p.waktu_absen) = ?`,
    [cabangId, targetYear, targetMonth]
  );

  const [[siswaAktifRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM siswa
     WHERE cabang_id = ? AND is_active = 1`,
    [cabangId]
  );

  const [[siswaNonaktifRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM siswa
     WHERE cabang_id = ? AND is_active = 0`,
    [cabangId]
  );

  const [[programRow]] = await db.query(
    `SELECT p.nama, COUNT(*) AS total
     FROM enrollment e
     JOIN siswa s ON s.id = e.siswa_id
     JOIN program p ON p.id = e.program_id
     WHERE s.cabang_id = ? AND YEAR(e.tanggal_daftar) = ? AND MONTH(e.tanggal_daftar) = ?
     GROUP BY p.id
     ORDER BY total DESC
     LIMIT 1`,
    [cabangId, targetYear, targetMonth]
  );

  return {
    presensi: Number(presensiRow?.total || 0),
    siswa_aktif: Number(siswaAktifRow?.total || 0),
    siswa_nonaktif: Number(siswaNonaktifRow?.total || 0),
    program_favorit: programRow?.nama || "-",
    program_favorit_total: Number(programRow?.total || 0),
  };
};

module.exports = {
  getKeuanganBulanan,
  getKeuanganTahunan,
  getLanjutanSummary,
};
