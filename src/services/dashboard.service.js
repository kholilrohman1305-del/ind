const db = require("../db");
const { ENROLLMENT_STATUS, TIPE_LES } = require("../config/constants");

const addCabangFilter = (column, cabangId, params) => {
  if (cabangId) {
    params.push(cabangId);
    return ` AND ${column} = ?`;
  }
  return "";
};

// Helper: Management salary only counts when period has started (not future)
const isPeriodStarted = (year, month) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const targetYear = Number(year);
  const targetMonth = Number(month);

  if (targetYear > currentYear) return false;
  if (targetYear === currentYear && targetMonth > currentMonth) return false;
  return true;
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
     WHERE en.siswa_id = ? AND en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'`,
    [siswaId]
  );

  const [[totalPertemuan]] = await db.query(
    `SELECT COALESCE(SUM(en.total_pertemuan), 0) AS total
     FROM enrollment en
     WHERE en.siswa_id = ? AND en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'`,
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

const getSummary = async (cabangId, { year, month, startDate, endDate } = {}) => {
  const now = new Date();
  const targetYear = Number(year || now.getFullYear());
  const targetMonth = Number(month || now.getMonth() + 1);
  const isCustom = startDate && endDate;

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
     WHERE en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
       AND p.tipe_les = '${TIPE_LES.PRIVAT}'${privatFilter}`,
    privatParams
  );

  const kelasParams = [];
  const kelasFilter = addCabangFilter("s.cabang_id", cabangId, kelasParams);
  const [[siswaKelas]] = await db.query(
    `SELECT COUNT(DISTINCT en.siswa_id) AS total
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
       AND p.tipe_les = '${TIPE_LES.KELAS}'${kelasFilter}`,
    kelasParams
  );

  const pendapatanTagihanParams = [];
  let pendapatanTagihanFilter = "";
  if (isCustom) {
    pendapatanTagihanFilter = "WHERE t.tanggal_jatuh_tempo BETWEEN ? AND ?";
    pendapatanTagihanParams.push(startDate, endDate);
  } else {
    pendapatanTagihanFilter = "WHERE YEAR(t.tanggal_jatuh_tempo) = ? AND MONTH(t.tanggal_jatuh_tempo) = ?";
    pendapatanTagihanParams.push(targetYear, targetMonth);
  }
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

  const pendapatanPembayaranParams = [];
  let pendapatanPembayaranFilter = "";
  if (isCustom) {
    pendapatanPembayaranFilter = "WHERE p.tanggal_bayar BETWEEN ? AND ?";
    pendapatanPembayaranParams.push(startDate, endDate);
  } else {
    pendapatanPembayaranFilter = "WHERE YEAR(p.tanggal_bayar) = ? AND MONTH(p.tanggal_bayar) = ?";
    pendapatanPembayaranParams.push(targetYear, targetMonth);
  }
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

  const gajiTransaksiParams = [];
  let gajiTransaksiFilter = "";
  if (isCustom) {
    gajiTransaksiFilter = "WHERE DATE(gt.created_at) BETWEEN ? AND ?";
    gajiTransaksiParams.push(startDate, endDate);
  } else {
    gajiTransaksiFilter = "WHERE YEAR(gt.created_at) = ? AND MONTH(gt.created_at) = ?";
    gajiTransaksiParams.push(targetYear, targetMonth);
  }
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

  let gajiManajemen = { total: 0 };
  if (isPeriodStarted(targetYear, targetMonth)) {
    const gajiManajemenParams = [];
    let gajiManajemenFilter = "WHERE e.is_active = 1";
    if (cabangId) {
      gajiManajemenFilter += " AND e.cabang_utama_id = ?";
      gajiManajemenParams.push(cabangId);
    }
    const [rows] = await db.query(
      `SELECT COALESCE(SUM(m.gaji_tambahan), 0) AS total
       FROM edukator e
       JOIN manajemen m ON m.id = e.manajemen_id
       ${gajiManajemenFilter}`,
      gajiManajemenParams
    );
    gajiManajemen = rows[0] || { total: 0 };
  }

  const pengeluaranParams = [];
  let pengeluaranFilter = "";
  if (isCustom) {
    pengeluaranFilter = "WHERE pe.tanggal BETWEEN ? AND ?";
    pengeluaranParams.push(startDate, endDate);
  } else {
    pengeluaranFilter = "WHERE YEAR(pe.tanggal) = ? AND MONTH(pe.tanggal) = ?";
    pengeluaranParams.push(targetYear, targetMonth);
  }
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
  let siswaBaruWhere = "";
  if (isCustom) {
    siswaBaruWhere = "WHERE DATE(s.created_at) BETWEEN ? AND ?";
    siswaBaruParams.push(startDate, endDate);
  } else {
    siswaBaruWhere = "WHERE YEAR(s.created_at) = ? AND MONTH(s.created_at) = ?";
    siswaBaruParams.push(targetYear, targetMonth);
  }
  const siswaBaruFilter = addCabangFilter("s.cabang_id", cabangId, siswaBaruParams);
  const [[siswaBaru]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM siswa s
     ${siswaBaruWhere}${siswaBaruFilter}`,
    siswaBaruParams
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
            s.nama AS siswa_nama, p.nama AS program_nama, k.nama AS kelas_nama, m.nama AS mapel_nama,
            e.nama AS edukator_nama
     FROM jadwal j
     LEFT JOIN enrollment en ON en.id = j.enrollment_id
     LEFT JOIN siswa s ON s.id = en.siswa_id
     LEFT JOIN program p ON p.id = j.program_id
     LEFT JOIN kelas k ON k.id = j.kelas_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     WHERE j.tanggal = CURDATE()${jadwalListFilter}
     ORDER BY j.jam_mulai ASC`,
    jadwalListParams
  );

  const topProgramParams = [];
  const topProgramFilter = addCabangFilter("p.cabang_id", cabangId, topProgramParams);
  const [[topProgram]] = await db.query(
    `SELECT p.id, p.nama, COUNT(en.id) AS total_siswa
     FROM program p
     LEFT JOIN enrollment en ON en.program_id = p.id AND en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
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
     WHERE en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
       AND en.sisa_pertemuan < 3${rendahFilter}
     ORDER BY en.sisa_pertemuan ASC
     LIMIT 10`,
    rendahParams
  );

  // Siswa menunggu jadwal (enrollment sudah dibuat tapi jadwal belum diatur)
  const menungguParams = [];
  const menungguFilter = addCabangFilter("s.cabang_id", cabangId, menungguParams);
  const [[siswaMenungguJadwal]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     WHERE en.status_enrollment = '${ENROLLMENT_STATUS.MENUNGGU_JADWAL}'${menungguFilter}`,
    menungguParams
  );

  // List siswa menunggu jadwal
  const menungguListParams = [];
  const menungguListFilter = addCabangFilter("s.cabang_id", cabangId, menungguListParams);
  const [siswaMenungguList] = await db.query(
    `SELECT en.id AS enrollment_id, s.id AS siswa_id, s.nama AS siswa_nama,
            p.nama AS program_nama, p.tipe_les, en.tanggal_daftar
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE en.status_enrollment = '${ENROLLMENT_STATUS.MENUNGGU_JADWAL}'${menungguListFilter}
     ORDER BY en.tanggal_daftar ASC
     LIMIT 10`,
    menungguListParams
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
    siswa_menunggu_jadwal: siswaMenungguJadwal?.total || 0,
    siswa_menunggu_jadwal_list: siswaMenungguList || [],
  };
};

const getCabangPerformance = async ({ year, month, startDate, endDate } = {}) => {
  const now = new Date();
  const targetYear = Number(year || now.getFullYear());
  const targetMonth = Number(month || now.getMonth() + 1);
  const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
  const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
  const isCustom = startDate && endDate;

  const [cabangRows] = await db.query(
    "SELECT id, kode, nama, is_active FROM cabang ORDER BY nama ASC"
  );

  let filterBayar, filterAbsen, filterSiswa;
  const params = [];

  if (isCustom) {
    filterBayar = "WHERE tanggal_bayar BETWEEN ? AND ?";
    filterAbsen = "WHERE DATE(p.waktu_absen) BETWEEN ? AND ?";
    filterSiswa = "WHERE DATE(created_at) BETWEEN ? AND ?";
    params.push(startDate, endDate);
  } else {
    filterBayar = "WHERE YEAR(tanggal_bayar) = ? AND MONTH(tanggal_bayar) = ?";
    filterAbsen = "WHERE YEAR(p.waktu_absen) = ? AND MONTH(p.waktu_absen) = ?";
    filterSiswa = "WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?";
    params.push(targetYear, targetMonth);
  }

  const [pemasukanRows] = await db.query(
    `SELECT cabang_id, COALESCE(SUM(nominal), 0) AS total
     FROM pembayaran
     ${filterBayar}
     GROUP BY cabang_id`,
    params
  );

  const [kehadiranRows] = await db.query(
    `SELECT j.cabang_id, COUNT(p.id) AS total
     FROM presensi p
     JOIN jadwal j ON j.id = p.jadwal_id
     ${filterAbsen}
     GROUP BY j.cabang_id`,
    params
  );

  const [siswaRows] = await db.query(
    `SELECT cabang_id, COUNT(*) AS total
     FROM siswa
     ${filterSiswa}
     GROUP BY cabang_id`,
    params
  );

  let siswaPrevRows = [];
  if (!isCustom) {
      [siswaPrevRows] = await db.query(
        `SELECT cabang_id, COUNT(*) AS total FROM siswa WHERE YEAR(created_at) = ? AND MONTH(created_at) = ? GROUP BY cabang_id`,
        [prevYear, prevMonth]
      );
  }

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

// Helper: Core Forecasting Logic (Holt-Winters / Holt's Linear)
const calculateForecast = (data, horizon = 3) => {
  const values = data.map(d => d.total);
  const N = values.length;
  const now = new Date();
  const forecast = [];
  const forecastPoints = [];
  const residuals = [];
  
  // Cek jika data tidak cukup
  if (N < 2) {
      return { history: data, forecast: [] };
  }

  if (N >= 24) {
    // --- HOLT-WINTERS (Additive) ---
    const SEASON_LENGTH = 12;
    const alpha = 0.3; // Level smoothing
    const beta = 0.1;  // Trend smoothing
    const gamma = 0.2; // Seasonality smoothing

    // Inisialisasi Level (L) dan Trend (T)
    let L = 0;
    for (let i = 0; i < SEASON_LENGTH; i++) L += values[i];
    L /= SEASON_LENGTH;

    let T = 0;
    for (let i = 0; i < SEASON_LENGTH; i++) {
      T += (values[SEASON_LENGTH + i] - values[i]) / SEASON_LENGTH;
    }
    T /= SEASON_LENGTH;

    // Inisialisasi Seasonal Indices (S)
    let S = [];
    for (let i = 0; i < SEASON_LENGTH; i++) {
      S.push(values[i] - L);
    }

    // Iterasi Data (Training)
    for (let i = SEASON_LENGTH; i < N; i++) {
      const Y = values[i];
      const S_idx = i % SEASON_LENGTH;
      const S_prev = S[S_idx];
      
      // Prediksi satu langkah ke depan (untuk hitung error)
      const pred = L + T + S_prev;
      residuals.push(Y - pred);

      const L_old = L;
      
      // Update Components
      L = alpha * (Y - S_prev) + (1 - alpha) * (L_old + T);
      T = beta * (L - L_old) + (1 - beta) * T;
      const S_new = gamma * (Y - L) + (1 - gamma) * S_prev;
      S[S_idx] = S_new;
    }

    // Forecast Masa Depan
    for (let k = 1; k <= horizon; k++) {
      const idx = (N + k - 1) % SEASON_LENGTH;
      const val = L + (k * T) + S[idx];
      forecastPoints.push(Math.max(0, Math.round(val)));
    }

  } else {
    // --- FALLBACK: HOLT'S LINEAR TREND (Double Exponential) ---
    // Digunakan jika data < 24 bulan
    const alpha = 0.5;
    const beta = 0.3;
    
    let L = values[0];
    let T = values[1] ? values[1] - values[0] : 0;
    
    // Iterasi Data
    for (let i = 1; i < N; i++) {
      const Y = values[i];
      const pred = L + T;
      residuals.push(Y - pred);

      const L_old = L;
      L = alpha * Y + (1 - alpha) * (L_old + T);
      T = beta * (L - L_old) + (1 - beta) * T;
    }

    // Forecast Masa Depan
    for (let k = 1; k <= horizon; k++) {
      const val = L + (k * T);
      forecastPoints.push(Math.max(0, Math.round(val)));
    }
  }

  // Hitung Confidence Interval (Berdasarkan RMSE Residual)
  const sumSqErr = residuals.reduce((acc, err) => acc + (err * err), 0);
  const rmse = Math.sqrt(sumSqErr / (residuals.length || 1));
  const tVal = 1.96; // 95% Confidence

  // --- DETEKSI ANOMALI ---
  // Tandai data sebagai anomali jika residual > 2 * RMSE (Penyimpangan Signifikan)
  const anomalyThreshold = 2 * rmse;
  const residualOffset = N >= 24 ? 12 : 1; // Offset index karena windowing/lag

  data.forEach((d, i) => {
    // Pastikan index ada dalam range residual yang dihitung
    if (i >= residualOffset && i < residualOffset + residuals.length) {
      const r = residuals[i - residualOffset];
      if (Math.abs(r) > anomalyThreshold) {
        d.is_anomaly = true;
      }
    }
  });

  for (let i = 0; i < forecastPoints.length; i++) {
    const k = i + 1;
    // Margin melebar seiring waktu
    const margin = tVal * rmse * Math.sqrt(k);
    const val = forecastPoints[i];
    
    const d = new Date(now.getFullYear(), now.getMonth() + k, 1);
    forecast.push({
      month: d.toISOString().slice(0, 7),
      total: Math.round(val),
      upper: Math.round(val + margin),
      lower: Math.max(0, Math.round(val - margin))
    });
  }

  return { history: data, forecast };
};

const getMonthlySeries = async ({ query, params = [] }) => {
  const [rows] = await db.query(query, params);
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.toISOString().slice(0, 7);
    const row = rows.find(r => r.month === m);
    data.push({ month: m, total: row ? Number(row.total) : 0 });
  }
  return data;
};

const getCabangAnalytics = async ({ year, month, cabangId } = {}) => {
  const now = new Date();
  const targetYear = Number(year || now.getFullYear());
  const targetMonth = Number(month || now.getMonth() + 1);

  const cabangParams = [];
  let cabangFilter = "";
  if (cabangId) {
    cabangFilter = "WHERE id = ?";
    cabangParams.push(cabangId);
  }
  const [cabangRows] = await db.query(
    `SELECT id, kode, nama, is_active FROM cabang ${cabangFilter} ORDER BY nama ASC`,
    cabangParams
  );

  const [totalSiswaRows] = await db.query(
    `SELECT cabang_id, COUNT(*) AS total
     FROM siswa
     ${cabangId ? "WHERE cabang_id = ?" : ""}
     GROUP BY cabang_id`,
    cabangId ? [cabangId] : []
  );
  const [siswaAktifRows] = await db.query(
    `SELECT cabang_id, COUNT(*) AS total
     FROM siswa
     WHERE is_active = 1${cabangId ? " AND cabang_id = ?" : ""}
     GROUP BY cabang_id`,
    cabangId ? [cabangId] : []
  );
  const [siswaBaruRows] = await db.query(
    `SELECT cabang_id, COUNT(*) AS total
     FROM siswa
     WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
       ${cabangId ? "AND cabang_id = ?" : ""}
     GROUP BY cabang_id`,
    cabangId ? [targetYear, targetMonth, cabangId] : [targetYear, targetMonth]
  );
  const [siswaPrivatRows] = await db.query(
    `SELECT s.cabang_id, COUNT(DISTINCT en.siswa_id) AS total
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}' AND p.tipe_les = '${TIPE_LES.PRIVAT}'
       ${cabangId ? "AND s.cabang_id = ?" : ""}
     GROUP BY s.cabang_id`,
    cabangId ? [cabangId] : []
  );
  const [siswaKelasRows] = await db.query(
    `SELECT s.cabang_id, COUNT(DISTINCT en.siswa_id) AS total
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}' AND p.tipe_les = '${TIPE_LES.KELAS}'
       ${cabangId ? "AND s.cabang_id = ?" : ""}
     GROUP BY s.cabang_id`,
    cabangId ? [cabangId] : []
  );
  const [edukatorRows] = await db.query(
    `SELECT cabang_utama_id AS cabang_id, COUNT(*) AS total
     FROM edukator
     WHERE is_active = 1${cabangId ? " AND cabang_utama_id = ?" : ""}
     GROUP BY cabang_utama_id`,
    cabangId ? [cabangId] : []
  );

  const [tagihanRows] = await db.query(
    `SELECT cabang_id, COALESCE(SUM(nominal), 0) AS total
     FROM tagihan
     WHERE YEAR(tanggal_jatuh_tempo) = ? AND MONTH(tanggal_jatuh_tempo) = ?
       ${cabangId ? "AND cabang_id = ?" : ""}
     GROUP BY cabang_id`,
    cabangId ? [targetYear, targetMonth, cabangId] : [targetYear, targetMonth]
  );
  const [pembayaranRows] = await db.query(
    `SELECT cabang_id, COALESCE(SUM(nominal), 0) AS total
     FROM pembayaran
     WHERE YEAR(tanggal_bayar) = ? AND MONTH(tanggal_bayar) = ?
       ${cabangId ? "AND cabang_id = ?" : ""}
     GROUP BY cabang_id`,
    cabangId ? [targetYear, targetMonth, cabangId] : [targetYear, targetMonth]
  );
  const [pengeluaranRows] = await db.query(
    `SELECT cabang_id, COALESCE(SUM(nominal), 0) AS total
     FROM pengeluaran
     WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?
       ${cabangId ? "AND cabang_id = ?" : ""}
     GROUP BY cabang_id`,
    cabangId ? [targetYear, targetMonth, cabangId] : [targetYear, targetMonth]
  );
  const [gajiTransaksiRows] = await db.query(
    `SELECT cabang_id, COALESCE(SUM(nominal), 0) AS total
     FROM gaji_transaksi
     WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
       ${cabangId ? "AND cabang_id = ?" : ""}
     GROUP BY cabang_id`,
    cabangId ? [targetYear, targetMonth, cabangId] : [targetYear, targetMonth]
  );
  let gajiManajemenRows = [];
  if (isPeriodStarted(targetYear, targetMonth)) {
    const [rows] = await db.query(
      `SELECT e.cabang_utama_id AS cabang_id, COALESCE(SUM(m.gaji_tambahan), 0) AS total
       FROM edukator e
       JOIN manajemen m ON m.id = e.manajemen_id
       WHERE e.is_active = 1${cabangId ? " AND e.cabang_utama_id = ?" : ""}
       GROUP BY e.cabang_utama_id`,
      cabangId ? [cabangId] : []
    );
    gajiManajemenRows = rows || [];
  }

  const toMap = (rows) => new Map(rows.map((row) => [row.cabang_id, Number(row.total || 0)]));

  const totalSiswaMap = toMap(totalSiswaRows);
  const siswaAktifMap = toMap(siswaAktifRows);
  const siswaBaruMap = toMap(siswaBaruRows);
  const siswaPrivatMap = toMap(siswaPrivatRows);
  const siswaKelasMap = toMap(siswaKelasRows);
  const edukatorMap = toMap(edukatorRows);
  const tagihanMap = toMap(tagihanRows);
  const pembayaranMap = toMap(pembayaranRows);
  const pengeluaranMap = toMap(pengeluaranRows);
  const gajiTransaksiMap = toMap(gajiTransaksiRows);
  const gajiManajemenMap = toMap(gajiManajemenRows);

  const cabang = cabangRows.map((cabangRow) => {
    const cabangKey = cabangRow.id;
    const pendapatan =
      (tagihanMap.get(cabangKey) || 0) + (pembayaranMap.get(cabangKey) || 0);
    const pengeluaran =
      (pengeluaranMap.get(cabangKey) || 0) +
      (gajiTransaksiMap.get(cabangKey) || 0) +
      (gajiManajemenMap.get(cabangKey) || 0);
    return {
      cabang_id: cabangKey,
      cabang_kode: cabangRow.kode,
      cabang_nama: cabangRow.nama,
      is_active: cabangRow.is_active ? 1 : 0,
      total_siswa: totalSiswaMap.get(cabangKey) || 0,
      siswa_aktif: siswaAktifMap.get(cabangKey) || 0,
      siswa_aktif_privat: siswaPrivatMap.get(cabangKey) || 0,
      siswa_aktif_kelas: siswaKelasMap.get(cabangKey) || 0,
      siswa_baru: siswaBaruMap.get(cabangKey) || 0,
      total_edukator: edukatorMap.get(cabangKey) || 0,
      pendapatan,
      pengeluaran,
      selisih: pendapatan - pengeluaran,
    };
  });

  const totalSummary = cabang.reduce(
    (acc, row) => {
      acc.total_siswa += row.total_siswa;
      acc.siswa_aktif += row.siswa_aktif;
      acc.siswa_aktif_privat += row.siswa_aktif_privat;
      acc.siswa_aktif_kelas += row.siswa_aktif_kelas;
      acc.siswa_baru += row.siswa_baru;
      acc.total_edukator += row.total_edukator;
      acc.pendapatan += row.pendapatan;
      acc.pengeluaran += row.pengeluaran;
      return acc;
    },
    {
      total_siswa: 0,
      siswa_aktif: 0,
      siswa_aktif_privat: 0,
      siswa_aktif_kelas: 0,
      siswa_baru: 0,
      total_edukator: 0,
      pendapatan: 0,
      pengeluaran: 0,
    }
  );
  totalSummary.selisih = totalSummary.pendapatan - totalSummary.pengeluaran;

  const pendapatanHistory = await getMonthlySeries({
    query: `
      SELECT DATE_FORMAT(tanggal_bayar, '%Y-%m') as month, SUM(nominal) as total
      FROM pembayaran
      WHERE tanggal_bayar >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 23 MONTH), '%Y-%m-01')
        ${cabangId ? "AND cabang_id = ?" : ""}
      GROUP BY month
      ORDER BY month ASC
    `,
    params: cabangId ? [cabangId] : [],
  });
  const pengeluaranHistory = await getMonthlySeries({
    query: `
      SELECT month, SUM(total) AS total FROM (
        SELECT DATE_FORMAT(tanggal, '%Y-%m') as month, SUM(nominal) as total
        FROM pengeluaran
        WHERE tanggal >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 23 MONTH), '%Y-%m-01')
          ${cabangId ? "AND cabang_id = ?" : ""}
        GROUP BY month
        UNION ALL
        SELECT DATE_FORMAT(created_at, '%Y-%m') as month, SUM(nominal) as total
        FROM gaji_transaksi
        WHERE created_at >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 23 MONTH), '%Y-%m-01')
          ${cabangId ? "AND cabang_id = ?" : ""}
        GROUP BY month
      ) t
      GROUP BY month
      ORDER BY month ASC
    `,
    params: cabangId ? [cabangId, cabangId] : [],
  });

  return {
    periode: { year: targetYear, month: targetMonth },
    summary: totalSummary,
    cabang,
    forecast: {
      pendapatan: calculateForecast(pendapatanHistory),
      pengeluaran: calculateForecast(pengeluaranHistory),
    },
  };
};

const getFinancialForecast = async (cabangId) => {
  const params = [];
  let filter = "";
  if (cabangId) {
    filter = "AND cabang_id = ?";
    params.push(cabangId);
  }

  // 1. Ambil Data Historis (24 Bulan Terakhir)
  const [rows] = await db.query(`
    SELECT DATE_FORMAT(tanggal_bayar, '%Y-%m') as month, SUM(nominal) as total
    FROM pembayaran
    WHERE tanggal_bayar >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 23 MONTH), '%Y-%m-01')
    ${filter}
    GROUP BY month
    ORDER BY month ASC
  `, params);

  // 2. Normalisasi Data
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.toISOString().slice(0, 7);
    const row = rows.find(r => r.month === m);
    data.push({ month: m, total: row ? Number(row.total) : 0 });
  }

  return calculateForecast(data);
};

const getEnrollmentForecast = async (cabangId) => {
  const params = [];
  let filter = "";
  if (cabangId) {
    filter = "AND s.cabang_id = ?";
    params.push(cabangId);
  }

  // 1. Ambil Data Historis Pendaftaran (24 Bulan Terakhir)
  // Menggunakan tanggal_daftar dari enrollment atau created_at dari siswa
  const [rows] = await db.query(`
    SELECT DATE_FORMAT(COALESCE(s.created_at, NOW()), '%Y-%m') as month, COUNT(*) as total
    FROM siswa s
    WHERE s.created_at >= DATE_FORMAT(DATE_SUB(NOW(), INTERVAL 23 MONTH), '%Y-%m-01')
    ${filter}
    GROUP BY month
    ORDER BY month ASC
  `, params);

  // 2. Normalisasi Data
  const data = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const m = d.toISOString().slice(0, 7);
    const row = rows.find(r => r.month === m);
    data.push({ month: m, total: row ? Number(row.total) : 0 });
  }

  // 3. Calculate Forecast
  const { history, forecast } = calculateForecast(data);
  return { history: data, forecast };
};

module.exports = {
  getSummary,
  getSiswaSummary,
  getCabangPerformance,
  getCabangAnalytics,
  getFinancialForecast,
  getEnrollmentForecast,
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
      `SELECT COUNT(DISTINCT CASE WHEN tipe_les = '${TIPE_LES.KELAS}' THEN kelas_id ELSE program_id END) AS total
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
       WHERE edukator_id = ? AND DATE(tanggal) = CURDATE()`,
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
       WHERE j.edukator_id = ? AND DATE(j.tanggal) = CURDATE()
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
