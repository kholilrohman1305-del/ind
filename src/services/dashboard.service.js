const db = require("../db");

const addCabangFilter = (column, cabangId, params) => {
  if (cabangId) {
    params.push(cabangId);
    return ` AND ${column} = ?`;
  }
  return "";
};

const getSiswaSummary = async (userId) => {
  const [siswaRows] = await db.query("SELECT id FROM siswa WHERE user_id = ? LIMIT 1", [userId]);
  const siswaId = siswaRows[0]?.id;
  if (!siswaId) {
    return {
      program_total: 0,
      progress_percent: 0,
      pertemuan_selesai: 0,
      pertemuan_total: 0,
      jadwal_hari_ini: 0,
      jadwal_list: [],
    };
  }

  const [[programCount]] = await db.query(
    `SELECT COUNT(DISTINCT en.program_id) AS total
     FROM enrollment en
     WHERE en.siswa_id = ? AND en.status_enrollment = 'aktif'`,
    [siswaId]
  );

  const [[totalPertemuan]] = await db.query(
    `SELECT COALESCE(SUM(en.total_pertemuan), 0) AS total
     FROM enrollment en
     WHERE en.siswa_id = ? AND en.status_enrollment = 'aktif'`,
    [siswaId]
  );

  const [[completedPrivat]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM presensi_siswa ps
     WHERE ps.siswa_id = ?`,
    [siswaId]
  );

  const [[completedKelas]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM jadwal_kelas_siswa jks
     JOIN enrollment en ON en.id = jks.enrollment_id
     WHERE en.siswa_id = ? AND jks.status = 'selesai'`,
    [siswaId]
  );

  const pertemuanSelesai = (completedPrivat?.total || 0) + (completedKelas?.total || 0);
  const pertemuanTotal = totalPertemuan?.total || 0;
  const progressPercent = pertemuanTotal
    ? Math.round((pertemuanSelesai / pertemuanTotal) * 100)
    : 0;

  const [[jadwalHariIni]] = await db.query(
    `SELECT COUNT(*) AS total FROM (
       SELECT j.id
       FROM jadwal j
       JOIN enrollment en ON en.id = j.enrollment_id
       WHERE en.siswa_id = ? AND j.tanggal = CURDATE()
       UNION ALL
       SELECT j.id
       FROM jadwal j
       JOIN jadwal_kelas_siswa jks ON jks.jadwal_id = j.id
       JOIN enrollment en ON en.id = jks.enrollment_id
       WHERE en.siswa_id = ? AND j.tanggal = CURDATE()
     ) t`,
    [siswaId, siswaId]
  );

  const [jadwalList] = await db.query(
    `SELECT * FROM (
       SELECT j.id, j.tanggal, j.jam_mulai, j.jam_selesai, j.status_jadwal,
              p.nama AS program_nama, m.nama AS mapel_nama,
              'privat' AS tipe_les
       FROM jadwal j
       JOIN enrollment en ON en.id = j.enrollment_id
       LEFT JOIN program p ON p.id = j.program_id
       LEFT JOIN mapel m ON m.id = j.mapel_id
       WHERE en.siswa_id = ?
       UNION ALL
       SELECT j.id, j.tanggal, j.jam_mulai, j.jam_selesai, j.status_jadwal,
              p.nama AS program_nama, m.nama AS mapel_nama,
              'kelas' AS tipe_les
       FROM jadwal j
       JOIN jadwal_kelas_siswa jks ON jks.jadwal_id = j.id
       JOIN enrollment en ON en.id = jks.enrollment_id
       LEFT JOIN program p ON p.id = en.program_id
       LEFT JOIN mapel m ON m.id = j.mapel_id
       WHERE en.siswa_id = ?
     ) t
     ORDER BY t.tanggal ASC, t.jam_mulai ASC
     LIMIT 6`,
    [siswaId, siswaId]
  );

  return {
    program_total: programCount?.total || 0,
    progress_percent: progressPercent,
    pertemuan_selesai: pertemuanSelesai,
    pertemuan_total: pertemuanTotal,
    jadwal_hari_ini: jadwalHariIni?.total || 0,
    jadwal_list: jadwalList || [],
  };
};

const getSummary = async (cabangId, { year, month } = {}) => {
  const now = new Date();
  const targetYear = Number(year || now.getFullYear());
  const targetMonth = Number(month || now.getMonth() + 1);
  const siswaAktifParams = [];
  const siswaAktifFilter = addCabangFilter("s.cabang_id", cabangId, siswaAktifParams);
  const [[siswaAktif]] = await db.query(
    `SELECT COUNT(*) AS total FROM siswa s WHERE s.is_active = 1${siswaAktifFilter}`,
    siswaAktifParams
  );

  const privatParams = [];
  const privatFilter = addCabangFilter("s.cabang_id", cabangId, privatParams);
  const [[siswaPrivat]] = await db.query(
    `SELECT COUNT(DISTINCT en.siswa_id) AS total
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE en.status_enrollment = 'aktif'
       AND p.tipe_les = 'privat'${privatFilter}`,
    privatParams
  );

  const kelasParams = [];
  const kelasFilter = addCabangFilter("s.cabang_id", cabangId, kelasParams);
  const [[siswaKelas]] = await db.query(
    `SELECT COUNT(DISTINCT en.siswa_id) AS total
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE en.status_enrollment = 'aktif'
       AND p.tipe_les = 'kelas'${kelasFilter}`,
    kelasParams
  );

  const pendapatanTagihanParams = [targetYear, targetMonth];
  let pendapatanTagihanFilter = "WHERE YEAR(t.tanggal_jatuh_tempo) = ? AND MONTH(t.tanggal_jatuh_tempo) = ?";
  if (cabangId) {
    pendapatanTagihanFilter += " AND t.cabang_id = ?";
    pendapatanTagihanParams.push(cabangId);
  }
  const [[pendapatanTagihan]] = await db.query(
    `SELECT COALESCE(SUM(t.nominal), 0) AS total
     FROM tagihan t
     ${pendapatanTagihanFilter}`,
    pendapatanTagihanParams
  );

  const pendapatanPembayaranParams = [targetYear, targetMonth];
  let pendapatanPembayaranFilter = "WHERE YEAR(p.tanggal_bayar) = ? AND MONTH(p.tanggal_bayar) = ?";
  if (cabangId) {
    pendapatanPembayaranFilter += " AND p.cabang_id = ?";
    pendapatanPembayaranParams.push(cabangId);
  }
  const [[pendapatanPembayaran]] = await db.query(
    `SELECT COALESCE(SUM(p.nominal), 0) AS total
     FROM pembayaran p
     ${pendapatanPembayaranFilter}`,
    pendapatanPembayaranParams
  );
  const pendapatanTotal =
    Number(pendapatanTagihan?.total || 0) + Number(pendapatanPembayaran?.total || 0);

  const gajiTransaksiParams = [targetYear, targetMonth];
  let gajiTransaksiFilter = "WHERE YEAR(gt.created_at) = ? AND MONTH(gt.created_at) = ?";
  if (cabangId) {
    gajiTransaksiFilter += " AND gt.cabang_id = ?";
    gajiTransaksiParams.push(cabangId);
  }
  const [[gajiTransaksi]] = await db.query(
    `SELECT COALESCE(SUM(gt.nominal), 0) AS total
     FROM gaji_transaksi gt
     ${gajiTransaksiFilter}`,
    gajiTransaksiParams
  );

  const gajiManajemenParams = [];
  let gajiManajemenFilter = "WHERE e.is_active = 1";
  if (cabangId) {
    gajiManajemenFilter += " AND e.cabang_utama_id = ?";
    gajiManajemenParams.push(cabangId);
  }
  const [[gajiManajemen]] = await db.query(
    `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
     FROM edukator e
     JOIN manajemen m ON m.id = e.manajemen_id
     ${gajiManajemenFilter}`,
    gajiManajemenParams
  );

  const pengeluaranParams = [targetYear, targetMonth];
  let pengeluaranFilter = "WHERE YEAR(pe.tanggal) = ? AND MONTH(pe.tanggal) = ?";
  if (cabangId) {
    pengeluaranFilter += " AND pe.cabang_id = ?";
    pengeluaranParams.push(cabangId);
  }
  const [[pengeluaranOperasional]] = await db.query(
    `SELECT COALESCE(SUM(pe.nominal), 0) AS total
     FROM pengeluaran pe
     ${pengeluaranFilter}`,
    pengeluaranParams
  );

  const pengeluaranTotal =
    Number(gajiTransaksi?.total || 0) +
    Number(gajiManajemen?.total || 0) +
    Number(pengeluaranOperasional?.total || 0);

  const siswaBaruParams = [];
  const siswaBaruFilter = addCabangFilter("s.cabang_id", cabangId, siswaBaruParams);
  const [[siswaBaru]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM siswa s
     WHERE YEAR(s.created_at) = ?
       AND MONTH(s.created_at) = ?${siswaBaruFilter}`,
    [targetYear, targetMonth, ...siswaBaruParams]
  );

  const jadwalCountParams = [];
  const jadwalCountFilter = addCabangFilter("j.cabang_id", cabangId, jadwalCountParams);
  const [[jadwalHariIni]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM jadwal j
     WHERE j.tanggal = CURDATE()${jadwalCountFilter}`,
    jadwalCountParams
  );

  const jadwalListParams = [];
  const jadwalListFilter = addCabangFilter("j.cabang_id", cabangId, jadwalListParams);
  const [jadwalList] = await db.query(
    `SELECT j.id, j.tanggal, j.jam_mulai, j.jam_selesai, j.status_jadwal,
            s.nama AS siswa_nama, p.nama AS program_nama, k.nama AS kelas_nama, m.nama AS mapel_nama
     FROM jadwal j
     LEFT JOIN enrollment en ON en.id = j.enrollment_id
     LEFT JOIN siswa s ON s.id = en.siswa_id
     LEFT JOIN program p ON p.id = j.program_id
     LEFT JOIN kelas k ON k.id = j.kelas_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     WHERE j.tanggal = CURDATE()${jadwalListFilter}
     ORDER BY j.jam_mulai ASC`,
    jadwalListParams
  );

  const topProgramParams = [];
  const topProgramFilter = addCabangFilter("p.cabang_id", cabangId, topProgramParams);
  const [[topProgram]] = await db.query(
    `SELECT p.id, p.nama, COUNT(en.id) AS total_siswa
     FROM program p
     LEFT JOIN enrollment en ON en.program_id = p.id AND en.status_enrollment = 'aktif'
     WHERE 1=1${topProgramFilter}
     GROUP BY p.id
     ORDER BY total_siswa DESC
     LIMIT 1`,
    topProgramParams
  );

  const rendahParams = [];
  const rendahFilter = addCabangFilter("s.cabang_id", cabangId, rendahParams);
  const [sisaPertemuan] = await db.query(
    `SELECT s.nama AS siswa_nama, p.nama AS program_nama, en.sisa_pertemuan
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE en.status_enrollment = 'aktif'
       AND en.sisa_pertemuan < 3${rendahFilter}
     ORDER BY en.sisa_pertemuan ASC
     LIMIT 10`,
    rendahParams
  );

  return {
    siswa_aktif: siswaAktif?.total || 0,
    siswa_privat: siswaPrivat?.total || 0,
    siswa_kelas: siswaKelas?.total || 0,
    pendapatan_bulan_ini: pendapatanTotal,
    pendapatan_tagihan_bulan_ini: pendapatanTagihan?.total || 0,
    pendapatan_pembayaran_bulan_ini: pendapatanPembayaran?.total || 0,
    pengeluaran_bulan_ini: pengeluaranTotal,
    pengeluaran_gaji_bulan_ini:
      Number(gajiTransaksi?.total || 0) + Number(gajiManajemen?.total || 0),
    pengeluaran_operasional_bulan_ini: pengeluaranOperasional?.total || 0,
    siswa_baru_bulan_ini: siswaBaru?.total || 0,
    jadwal_hari_ini: jadwalHariIni?.total || 0,
    jadwal_list: jadwalList || [],
    program_terbanyak: topProgram || null,
    siswa_pertemuan_rendah: sisaPertemuan || [],
  };
};

const getCabangPerformance = async ({ year, month } = {}) => {
  const now = new Date();
  const targetYear = Number(year || now.getFullYear());
  const targetMonth = Number(month || now.getMonth() + 1);
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;

  const [cabangRows] = await db.query(
    "SELECT id, kode, nama, is_active FROM cabang ORDER BY nama ASC"
  );

  const [pemasukanRows] = await db.query(
    `SELECT cabang_id, COALESCE(SUM(nominal), 0) AS total
     FROM pembayaran
     WHERE YEAR(tanggal_bayar) = ? AND MONTH(tanggal_bayar) = ?
     GROUP BY cabang_id`,
    [targetYear, targetMonth]
  );

  const [kehadiranRows] = await db.query(
    `SELECT j.cabang_id, COUNT(p.id) AS total
     FROM presensi p
     JOIN jadwal j ON j.id = p.jadwal_id
     WHERE YEAR(p.waktu_absen) = ? AND MONTH(p.waktu_absen) = ?
     GROUP BY j.cabang_id`,
    [targetYear, targetMonth]
  );

  const [siswaRows] = await db.query(
    `SELECT cabang_id, COUNT(*) AS total
     FROM siswa
     WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
     GROUP BY cabang_id`,
    [targetYear, targetMonth]
  );

  const [siswaPrevRows] = await db.query(
    `SELECT cabang_id, COUNT(*) AS total
     FROM siswa
     WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
     GROUP BY cabang_id`,
    [prevYear, prevMonth]
  );

  const pemasukanMap = new Map(
    pemasukanRows.map((row) => [row.cabang_id, Number(row.total || 0)])
  );
  const kehadiranMap = new Map(
    kehadiranRows.map((row) => [row.cabang_id, Number(row.total || 0)])
  );
  const siswaMap = new Map(
    siswaRows.map((row) => [row.cabang_id, Number(row.total || 0)])
  );
  const siswaPrevMap = new Map(
    siswaPrevRows.map((row) => [row.cabang_id, Number(row.total || 0)])
  );

  const cabangPerformance = cabangRows.map((cabang) => {
    const siswaBaru = siswaMap.get(cabang.id) || 0;
    const siswaPrev = siswaPrevMap.get(cabang.id) || 0;
    return {
      cabang_id: cabang.id,
      cabang_kode: cabang.kode,
      cabang_nama: cabang.nama,
      is_active: cabang.is_active ? 1 : 0,
      pemasukan: pemasukanMap.get(cabang.id) || 0,
      kehadiran: kehadiranMap.get(cabang.id) || 0,
      siswa_baru: siswaBaru,
      siswa_baru_prev: siswaPrev,
      pertumbuhan: siswaBaru - siswaPrev,
    };
  });

  const topPemasukan = [...cabangPerformance]
    .sort((a, b) => b.pemasukan - a.pemasukan)
    .slice(0, 5);
  const topKehadiran = [...cabangPerformance]
    .sort((a, b) => b.kehadiran - a.kehadiran)
    .slice(0, 5);
  const topPertumbuhan = [...cabangPerformance]
    .sort((a, b) => b.pertumbuhan - a.pertumbuhan || b.siswa_baru - a.siswa_baru)
    .slice(0, 5);

  return {
    periode: { year: targetYear, month: targetMonth },
    cabang: cabangPerformance,
    top_pemasukan: topPemasukan,
    top_kehadiran: topKehadiran,
    top_pertumbuhan: topPertumbuhan,
  };
};

module.exports = {
  getSummary,
  getSiswaSummary,
  getCabangPerformance,
  getEdukatorSummary: async (userId) => {
    const [rows] = await db.query(
      "SELECT id FROM edukator WHERE user_id = ? LIMIT 1",
      [userId]
    );
    const edukatorId = rows[0]?.id;
    if (!edukatorId) {
      return {
        program_total: 0,
        siswa_total: 0,
        kehadiran_bulan_ini: 0,
        jadwal_hari_ini: 0,
        jadwal_list: [],
      };
    }

    const [[programCount]] = await db.query(
      `SELECT COUNT(DISTINCT CASE WHEN tipe_les = 'kelas' THEN kelas_id ELSE program_id END) AS total
       FROM jadwal
       WHERE edukator_id = ?`,
      [edukatorId]
    );

    const [[siswaCount]] = await db.query(
      `SELECT COUNT(DISTINCT siswa_id) AS total
       FROM (
         SELECT en.siswa_id
         FROM jadwal j
         JOIN enrollment en ON en.id = j.enrollment_id
         WHERE j.edukator_id = ? AND j.enrollment_id IS NOT NULL
         UNION
         SELECT en.siswa_id
         FROM jadwal j
         JOIN jadwal_kelas_siswa jks ON jks.jadwal_id = j.id
         JOIN enrollment en ON en.id = jks.enrollment_id
         WHERE j.edukator_id = ?
       ) AS siswa_union`,
      [edukatorId, edukatorId]
    );

    const [[kehadiran]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM presensi
       WHERE edukator_id = ?
         AND YEAR(waktu_absen) = YEAR(CURDATE())
         AND MONTH(waktu_absen) = MONTH(CURDATE())`,
      [edukatorId]
    );

    const [[jadwalHariIni]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM jadwal
       WHERE edukator_id = ? AND tanggal = CURDATE()`,
      [edukatorId]
    );

    const [jadwalList] = await db.query(
      `SELECT j.id, j.tanggal, j.jam_mulai, j.jam_selesai, j.status_jadwal,
              s.nama AS siswa_nama, p.nama AS program_nama, k.nama AS kelas_nama, m.nama AS mapel_nama
       FROM jadwal j
       LEFT JOIN enrollment en ON en.id = j.enrollment_id
       LEFT JOIN siswa s ON s.id = en.siswa_id
       LEFT JOIN program p ON p.id = j.program_id
       LEFT JOIN kelas k ON k.id = j.kelas_id
       LEFT JOIN mapel m ON m.id = j.mapel_id
       WHERE j.edukator_id = ? AND j.tanggal = CURDATE()
       ORDER BY j.jam_mulai ASC`,
      [edukatorId]
    );

    return {
      program_total: programCount?.total || 0,
      siswa_total: siswaCount?.total || 0,
      kehadiran_bulan_ini: kehadiran?.total || 0,
      jadwal_hari_ini: jadwalHariIni?.total || 0,
      jadwal_list: jadwalList || [],
    };
  },
};
