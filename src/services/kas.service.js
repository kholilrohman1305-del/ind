const db = require("../db");

const buildPeriod = (year, month) => {
  const safeYear = Number(year || new Date().getFullYear());
  const safeMonth = Number(month || new Date().getMonth() + 1);
  const padded = String(safeMonth).padStart(2, "0");
  return `${safeYear}-${padded}-01`;
};

// Helper: Check if period is current or past (not future)
// Management salary only counts for periods that have started (tanggal 1 sudah lewat)
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

const getSaldoAwal = async ({ cabangId, year, month }) => {
  const period = buildPeriod(year, month);
  const [rows] = await db.query(
    `SELECT nominal FROM saldo_awal
     WHERE cabang_id = ? AND periode = ? LIMIT 1`,
    [cabangId, period]
  );
  return Number(rows[0]?.nominal || 0);
};

const upsertSaldoAwal = async ({ cabangId, year, month, nominal }) => {
  const period = buildPeriod(year, month);
  const nominalValue = Number(nominal || 0);
  await db.query(
    `INSERT INTO saldo_awal (cabang_id, periode, nominal)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE nominal = VALUES(nominal)`,
    [cabangId, period, nominalValue]
  );
  return { cabang_id: cabangId, periode: period, nominal: nominalValue };
};

const getSummary = async ({ cabangId, year, month }) => {
  const targetYear = Number(year || new Date().getFullYear());
  const targetMonth = Number(month || new Date().getMonth() + 1);
  const saldoAwal = await getSaldoAwal({ cabangId, year: targetYear, month: targetMonth });

  const [[pemasukanRow]] = await db.query(
    `SELECT COALESCE(SUM(nominal), 0) AS total
     FROM pembayaran
     WHERE cabang_id = ? AND YEAR(tanggal_bayar) = ? AND MONTH(tanggal_bayar) = ?`,
    [cabangId, targetYear, targetMonth]
  );

  // Pemasukan lain-lain (termasuk Transport ILHAMI)
  const [[kasPemasukanRow]] = await db.query(
    `SELECT COALESCE(SUM(nominal), 0) AS total
     FROM kas_pemasukan
     WHERE cabang_id = ? AND YEAR(tanggal) = ? AND MONTH(tanggal) = ?`,
    [cabangId, targetYear, targetMonth]
  );

  const [[pengeluaranRow]] = await db.query(
    `SELECT COALESCE(SUM(nominal), 0) AS total
     FROM pengeluaran
     WHERE cabang_id = ? AND YEAR(tanggal) = ? AND MONTH(tanggal) = ?`,
    [cabangId, targetYear, targetMonth]
  );

  const [[gajiRow]] = await db.query(
    `SELECT COALESCE(SUM(nominal), 0) AS total
     FROM gaji_transaksi
     WHERE cabang_id = ? AND YEAR(created_at) = ? AND MONTH(created_at) = ?`,
    [cabangId, targetYear, targetMonth]
  );

  // Gaji manajemen hanya dihitung jika periode sudah berjalan (bukan bulan depan)
  let manajemenTotal = 0;
  if (isPeriodStarted(targetYear, targetMonth)) {
    const [[manajemenRow]] = await db.query(
      `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
       FROM edukator e
       JOIN manajemen m ON m.id = e.manajemen_id
       WHERE e.cabang_utama_id = ? AND e.is_active = 1`,
      [cabangId]
    );
    manajemenTotal = Number(manajemenRow?.total || 0);
  }

  const pemasukan = Number(pemasukanRow?.total || 0) + Number(kasPemasukanRow?.total || 0);
  const pengeluaran =
    Number(pengeluaranRow?.total || 0) +
    Number(gajiRow?.total || 0) +
    manajemenTotal;

  const saldoAkhir = saldoAwal + pemasukan - pengeluaran;

  return {
    saldo_awal: saldoAwal,
    pemasukan,
    pengeluaran,
    saldo_akhir: saldoAkhir,
  };
};

const listEntries = async ({ cabangId, year, month }, { limit, offset } = {}) => {
  const targetYear = Number(year || new Date().getFullYear());
  const targetMonth = Number(month || new Date().getMonth() + 1);

  const [pembayaranRows] = await db.query(
    `SELECT pb.id, pb.nominal, pb.tanggal_bayar AS tanggal,
            'pemasukan' AS tipe, 'Pembayaran' AS kategori,
            CONCAT(s.nama, ' - ', p.nama) AS deskripsi
     FROM pembayaran pb
     JOIN tagihan t ON t.id = pb.tagihan_id
     JOIN siswa s ON s.id = t.siswa_id
     JOIN enrollment en ON en.id = t.enrollment_id
     JOIN program p ON p.id = en.program_id
     WHERE pb.cabang_id = ? AND YEAR(pb.tanggal_bayar) = ? AND MONTH(pb.tanggal_bayar) = ?
     ORDER BY pb.tanggal_bayar DESC, pb.id DESC`,
    [cabangId, targetYear, targetMonth]
  );

  // Pemasukan lain-lain (Transport ILHAMI, dll)
  const [kasPemasukanRows] = await db.query(
    `SELECT id, nominal, tanggal, 'pemasukan' AS tipe, kategori,
            COALESCE(deskripsi, '-') AS deskripsi
     FROM kas_pemasukan
     WHERE cabang_id = ? AND YEAR(tanggal) = ? AND MONTH(tanggal) = ?
     ORDER BY tanggal DESC, id DESC`,
    [cabangId, targetYear, targetMonth]
  );

  const [pengeluaranRows] = await db.query(
    `SELECT id, nominal, tanggal, 'pengeluaran' AS tipe, kategori,
            COALESCE(deskripsi, '-') AS deskripsi
     FROM pengeluaran
     WHERE cabang_id = ? AND YEAR(tanggal) = ? AND MONTH(tanggal) = ?
     ORDER BY tanggal DESC, id DESC`,
    [cabangId, targetYear, targetMonth]
  );

  const [gajiRows] = await db.query(
    `SELECT g.id, g.nominal, DATE(g.created_at) AS tanggal,
            'pengeluaran' AS tipe, 'Gaji Edukator' AS kategori,
            e.nama AS deskripsi
     FROM gaji_transaksi g
     JOIN edukator e ON e.id = g.edukator_id
     WHERE g.cabang_id = ? AND YEAR(g.created_at) = ? AND MONTH(g.created_at) = ?
     ORDER BY g.created_at DESC, g.id DESC`,
    [cabangId, targetYear, targetMonth]
  );

  // Gaji manajemen hanya ditampilkan jika periode sudah berjalan (bukan bulan depan)
  let manajemenEntry = [];
  if (isPeriodStarted(targetYear, targetMonth)) {
    const [[manajemenRow]] = await db.query(
      `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
       FROM edukator e
       JOIN manajemen m ON m.id = e.manajemen_id
       WHERE e.cabang_utama_id = ? AND e.is_active = 1`,
      [cabangId]
    );

    const manajemenTotal = Number(manajemenRow?.total || 0);
    if (manajemenTotal > 0) {
      manajemenEntry = [
        {
          id: `manajemen-${targetYear}-${targetMonth}`,
          nominal: manajemenTotal,
          tanggal: buildPeriod(targetYear, targetMonth),
          tipe: "pengeluaran",
          kategori: "Gaji Manajemen",
          deskripsi: "Tambahan jabatan edukator",
        },
      ];
    }
  }

  const allEntries = [
    ...pembayaranRows,
    ...kasPemasukanRows,
    ...pengeluaranRows,
    ...gajiRows,
    ...manajemenEntry,
  ];

  allEntries.sort((a, b) => {
    const dateA = new Date(a.tanggal);
    const dateB = new Date(b.tanggal);
    if (dateA.getTime() === dateB.getTime()) return 0;
    return dateB.getTime() - dateA.getTime();
  });

  const total = allEntries.length;
  if (limit !== undefined) {
    const start = offset || 0;
    return { rows: allEntries.slice(start, start + limit), total };
  }
  return { rows: allEntries, total };
};

module.exports = {
  getSummary,
  listEntries,
  upsertSaldoAwal,
};
