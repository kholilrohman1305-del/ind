const db = require("../db");

// Helper: Check if period is current or past (not future)
// Management salary only counts for periods that have started
const isPeriodStarted = (year, month) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const targetYear = Number(year);
  const targetMonth = Number(month);

  // Future year
  if (targetYear > currentYear) return false;
  // Same year, future month
  if (targetYear === currentYear && targetMonth > currentMonth) return false;

  return true;
};

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

  const pembayaranWeek = buildWeekCase("tanggal_bayar");
  const pengeluaranWeek = buildWeekCase("tanggal");
  const gajiWeek = buildWeekCase("created_at");

  // Pemasukan = pembayaran aktual yang diterima (bukan tagihan/invoice)
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

  // Query untuk Pie Chart (Group by Kategori)
  const [pengeluaranKategoriRows] = await db.query(
    `SELECT kategori, COALESCE(SUM(nominal), 0) AS total
     FROM pengeluaran
     WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?${cabangFilter}
     GROUP BY kategori`,
    params
  );

  const [gajiRows] = await db.query(
    `SELECT ${gajiWeek} AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM gaji_transaksi
     WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  // Gaji manajemen hanya dihitung jika periode sudah berjalan
  let gajiManajemenTotal = 0;
  if (isPeriodStarted(year, month)) {
    const [gajiManajemenRows] = await db.query(
      `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
       FROM edukator e
       JOIN manajemen m ON m.id = e.manajemen_id
       WHERE e.is_active = 1${cabangId ? " AND e.cabang_utama_id = ?" : ""}`,
      cabangId ? [cabangId] : []
    );
    gajiManajemenTotal = Number(gajiManajemenRows[0]?.total || 0);
  }

  const sumByBucket = (rows) =>
    rows.reduce((acc, row) => {
      acc[row.bucket] = Number(row.total || 0);
      return acc;
    }, {});

  const pembayaranMap = sumByBucket(pembayaranRows);
  const pengeluaranMap = sumByBucket(pengeluaranRows);
  const gajiMap = sumByBucket(gajiRows);

  // Pemasukan = pembayaran yang diterima (bukan tagihan/invoice)
  // Tagihan adalah piutang, bukan pemasukan aktual
  const pemasukan = WEEK_LABELS.map((_, index) => {
    const key = index + 1;
    return Number(pembayaranMap[key] || 0);
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

  // Susun Data Pie Chart
  const totalGajiEdukator = Object.values(gajiMap).reduce((a, b) => a + b, 0);
  const pieData = pengeluaranKategoriRows.map(r => ({ label: r.kategori, value: Number(r.total) }));

  if (totalGajiEdukator > 0) pieData.push({ label: 'Gaji Edukator', value: totalGajiEdukator });
  if (gajiManajemenTotal > 0) pieData.push({ label: 'Gaji Manajemen', value: gajiManajemenTotal });

  return {
    labels: WEEK_LABELS,
    datasets: { pemasukan, pengeluaran },
    pie_data: pieData.sort((a, b) => b.value - a.value)
  };
};

const getKeuanganTahunan = async ({ cabangId, year }) => {
  const params = [year];
  const cabangFilter = cabangId ? " AND cabang_id = ?" : "";
  if (cabangId) params.push(cabangId);

  // Pemasukan = pembayaran aktual yang diterima (bukan tagihan/invoice)
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

  // Query untuk Pie Chart (Group by Kategori)
  const [pengeluaranKategoriRows] = await db.query(
    `SELECT kategori, COALESCE(SUM(nominal), 0) AS total
     FROM pengeluaran
     WHERE YEAR(tanggal) = ?${cabangFilter}
     GROUP BY kategori`,
    params
  );

  const [gajiRows] = await db.query(
    `SELECT MONTH(created_at) AS bucket, COALESCE(SUM(nominal), 0) AS total
     FROM gaji_transaksi
     WHERE YEAR(created_at) = ?${cabangFilter}
     GROUP BY bucket`,
    params
  );

  // Get base management salary
  let gajiManajemenPerBulan = 0;
  const [gajiManajemenRows] = await db.query(
    `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
     FROM edukator e
     JOIN manajemen m ON m.id = e.manajemen_id
     WHERE e.is_active = 1${cabangId ? " AND e.cabang_utama_id = ?" : ""}`,
    cabangId ? [cabangId] : []
  );
  gajiManajemenPerBulan = Number(gajiManajemenRows[0]?.total || 0);

  const sumByBucket = (rows) =>
    rows.reduce((acc, row) => {
      acc[row.bucket] = Number(row.total || 0);
      return acc;
    }, {});

  const pembayaranMap = sumByBucket(pembayaranRows);
  const pengeluaranMap = sumByBucket(pengeluaranRows);
  const gajiMap = sumByBucket(gajiRows);

  // Pemasukan = pembayaran aktual yang diterima (bukan tagihan/invoice)
  const pemasukan = MONTH_LABELS.map((_, index) => {
    const key = index + 1;
    return Number(pembayaranMap[key] || 0);
  });

  // Hitung pengeluaran per bulan, gaji manajemen hanya untuk bulan yang sudah berjalan
  let totalGajiManajemenYearly = 0;
  const pengeluaran = MONTH_LABELS.map((_, index) => {
    const monthNum = index + 1;
    const baseExpense = Number(pengeluaranMap[monthNum] || 0) + Number(gajiMap[monthNum] || 0);

    // Hanya tambahkan gaji manajemen jika bulan sudah berjalan
    if (isPeriodStarted(year, monthNum)) {
      totalGajiManajemenYearly += gajiManajemenPerBulan;
      return baseExpense + gajiManajemenPerBulan;
    }
    return baseExpense;
  });

  // Susun Data Pie Chart
  const totalGajiEdukator = Object.values(gajiMap).reduce((a, b) => a + b, 0);

  const pieData = pengeluaranKategoriRows.map(r => ({ label: r.kategori, value: Number(r.total) }));
  if (totalGajiEdukator > 0) pieData.push({ label: 'Gaji Edukator', value: totalGajiEdukator });
  if (totalGajiManajemenYearly > 0) pieData.push({ label: 'Gaji Manajemen', value: totalGajiManajemenYearly });

  return {
    labels: MONTH_LABELS,
    datasets: { pemasukan, pengeluaran },
    pie_data: pieData.sort((a, b) => b.value - a.value)
  };
};

const getLanjutanSummary = async ({ cabangId, year, month }) => {
  const targetYear = Number(year || new Date().getFullYear());
  const targetMonth = Number(month || new Date().getMonth() + 1);
  
  const presensiParams = [targetYear, targetMonth];
  let presensiFilter = "";
  if (cabangId) {
    presensiFilter = " AND j.cabang_id = ?";
    presensiParams.push(cabangId);
  }

  const [[presensiRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM presensi p
     JOIN jadwal j ON j.id = p.jadwal_id
     WHERE YEAR(p.waktu_absen) = ? AND MONTH(p.waktu_absen) = ?${presensiFilter}`,
    presensiParams
  );

  const siswaParams = [];
  let siswaFilter = "";
  if (cabangId) {
    siswaFilter = " AND cabang_id = ?";
    siswaParams.push(cabangId);
  }

  const [[siswaAktifRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM siswa
     WHERE is_active = 1${siswaFilter}`,
    siswaParams
  );

  const [[siswaNonaktifRow]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM siswa
     WHERE is_active = 0${siswaFilter}`,
    siswaParams
  );

  const programParams = [targetYear, targetMonth];
  let programFilter = "";
  if (cabangId) {
    programFilter = " AND s.cabang_id = ?";
    programParams.push(cabangId);
  }

  const [[programRow]] = await db.query(
    `SELECT p.nama, COUNT(*) AS total
     FROM enrollment e
     JOIN siswa s ON s.id = e.siswa_id
     JOIN program p ON p.id = e.program_id
     WHERE YEAR(e.tanggal_daftar) = ? AND MONTH(e.tanggal_daftar) = ?${programFilter}
     GROUP BY p.id
     ORDER BY total DESC
     LIMIT 1`,
    programParams
  );

  return {
    presensi: Number(presensiRow?.total || 0),
    siswa_aktif: Number(siswaAktifRow?.total || 0),
    siswa_nonaktif: Number(siswaNonaktifRow?.total || 0),
    program_favorit: programRow?.nama || "-",
    program_favorit_total: Number(programRow?.total || 0),
  };
};

const getDetailPengeluaran = async ({ cabangId, year, month, category }) => {
  const params = [];
  let dateFilter = "";
  
  if (year && month) {
    dateFilter = "YEAR(tanggal) = ? AND MONTH(tanggal) = ?";
    params.push(year, month);
  } else {
    dateFilter = "YEAR(tanggal) = ?";
    params.push(year || new Date().getFullYear());
  }

  const cabangFilter = cabangId ? " AND cabang_id = ?" : "";
  if (cabangId) params.push(cabangId);

  if (category === 'Gaji Edukator') {
    const dateFilterGaji = dateFilter.replace(/tanggal/g, 'created_at');
    const query = `
      SELECT e.nama AS label, SUM(gt.nominal) AS value
      FROM gaji_transaksi gt
      JOIN edukator e ON e.id = gt.edukator_id
      WHERE ${dateFilterGaji} ${cabangFilter.replace('cabang_id', 'gt.cabang_id')}
      GROUP BY e.id
      ORDER BY value DESC`;
    const [rows] = await db.query(query, params);
    return rows;
  } 
  
  if (category === 'Gaji Manajemen') {
    // Untuk bulanan: hanya tampilkan jika periode sudah berjalan
    if (month && !isPeriodStarted(year, month)) {
      return [];
    }

    const cabangParams = cabangId ? [cabangId] : [];
    const query = `
      SELECT e.nama AS label, m.gaji_tambahan AS value
      FROM edukator e
      JOIN manajemen m ON m.id = e.manajemen_id
      WHERE e.is_active = 1 ${cabangFilter.replace('cabang_id', 'e.cabang_utama_id')}
      ORDER BY value DESC`;
    const [rows] = await db.query(query, cabangParams);

    if (!month) {
      // Untuk tahunan: hitung berapa bulan yang sudah berjalan
      const targetYear = Number(year || new Date().getFullYear());
      let monthsStarted = 0;
      for (let m = 1; m <= 12; m++) {
        if (isPeriodStarted(targetYear, m)) {
          monthsStarted++;
        }
      }
      return rows.map(r => ({ ...r, value: r.value * monthsStarted }));
    }
    return rows;
  }

  const query = `
    SELECT keperluan AS label, nominal AS value, tanggal
    FROM pengeluaran
    WHERE kategori = ? AND ${dateFilter} ${cabangFilter}
    ORDER BY value DESC`;
  const [rows] = await db.query(query, [category, ...params]);
  return rows;
};

module.exports = {
  getKeuanganBulanan,
  getKeuanganTahunan,
  getLanjutanSummary,
  getDetailPengeluaran,
};
