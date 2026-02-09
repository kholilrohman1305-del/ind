const db = require("../db");

const getDateRange = (period) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);

  if (period === 'hari ini') {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'kemarin') {
    start.setDate(start.getDate() - 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(end.getDate() - 1);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'minggu ini') {
    const day = start.getDay() || 7; // Convert Sun (0) to 7
    if (day !== 1) start.setHours(-24 * (day - 1));
    else start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (period === 'bulan ini') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (period === 'tahun ini') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  }
  
  return { start, end };
};

const processQuery = async (query, cabangId) => {
  const q = query.toLowerCase();
  let period = 'bulan ini'; // Default period
  
  if (q.includes('hari ini')) period = 'hari ini';
  else if (q.includes('kemarin')) period = 'kemarin';
  else if (q.includes('minggu ini')) period = 'minggu ini';
  else if (q.includes('tahun ini')) period = 'tahun ini';

  const { start, end } = getDateRange(period);
  const params = [start, end];
  let cabangFilter = "";
  if (cabangId) {
    cabangFilter = "AND cabang_id = ?";
    params.push(cabangId);
  }

  // 1. Intent: Omzet / Pendapatan
  if (q.includes('omzet') || q.includes('pendapatan') || q.includes('pemasukan')) {
    const [rows] = await db.query(`
      SELECT COALESCE(SUM(nominal), 0) as total 
      FROM pembayaran 
      WHERE tanggal_bayar BETWEEN ? AND ? ${cabangFilter}
    `, params);
    
    return {
      type: 'currency',
      value: rows[0].total,
      label: `Total Pendapatan (${period})`
    };
  }
  
  // 2. Intent: Pengeluaran
  if (q.includes('pengeluaran') || q.includes('biaya')) {
    const [rows] = await db.query(`
      SELECT COALESCE(SUM(nominal), 0) as total 
      FROM pengeluaran 
      WHERE tanggal BETWEEN ? AND ? ${cabangFilter}
    `, params);
    
    // Tambah Gaji
    const gajiParams = [start, end];
    let gajiFilter = "";
    if (cabangId) {
        gajiFilter = "AND cabang_id = ?";
        gajiParams.push(cabangId);
    }
    const [gajiRows] = await db.query(`
        SELECT COALESCE(SUM(nominal), 0) as total
        FROM gaji_transaksi
        WHERE created_at BETWEEN ? AND ? ${gajiFilter}
    `, gajiParams);

    const total = Number(rows[0].total) + Number(gajiRows[0].total);

    return {
      type: 'currency',
      value: total,
      label: `Total Pengeluaran (${period})`
    };
  }

  // 3. Intent: Siswa
  if (q.includes('siswa') || q.includes('murid')) {
    if (q.includes('baru')) {
        const [rows] = await db.query(`
            SELECT COUNT(*) as total 
            FROM siswa 
            WHERE created_at BETWEEN ? AND ? ${cabangFilter.replace('cabang_id', 'cabang_id')} 
        `, params);
        return {
            type: 'number',
            value: rows[0].total,
            label: `Siswa Baru (${period})`
        };
    }
    // Total active students (snapshot)
    const activeParams = [];
    let activeFilter = "";
    if (cabangId) {
        activeFilter = "AND cabang_id = ?";
        activeParams.push(cabangId);
    }
    const [rows] = await db.query(`
        SELECT COUNT(*) as total FROM siswa WHERE is_active = 1 ${activeFilter}
    `, activeParams);
    return {
        type: 'number',
        value: rows[0].total,
        label: `Total Siswa Aktif`
    };
  }

  return {
      type: 'text',
      value: "Maaf, saya belum mengerti. Coba tanya: 'omzet bulan ini', 'pengeluaran minggu ini', atau 'total siswa'.",
      label: "Bot Assistant"
  };
};

module.exports = { processQuery };