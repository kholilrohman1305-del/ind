const bcrypt = require("bcryptjs");
const db = require("../db");
const { ROLES, JADWAL_STATUS } = require("../config/constants");

const normalizeMapelIds = (mapelIds) => {
  if (!mapelIds) return [];
  if (Array.isArray(mapelIds)) {
    return mapelIds.map((id) => Number(id)).filter(Boolean);
  }
  return String(mapelIds)
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean);
};

const listEdukator = async (cabangId, { limit, offset } = {}) => {
  const whereClause = cabangId ? "WHERE e.cabang_utama_id = ?" : "";
  const whereParams = cabangId ? [cabangId] : [];

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM edukator e ${whereClause}`,
    whereParams
  );

  let dataQuery = `SELECT e.id, e.user_id, e.nama, e.nik, e.telepon, e.alamat,
            e.pendidikan_terakhir, e.foto, e.cabang_utama_id, e.is_active,
            e.manajemen_id, mn.nama AS manajemen_nama, c.nama AS cabang_nama,
            e.created_at, u.email,
            GROUP_CONCAT(m.id) as mapel_ids,
            GROUP_CONCAT(m.nama) as mapel_nama
     FROM edukator e
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN manajemen mn ON mn.id = e.manajemen_id
     LEFT JOIN cabang c ON c.id = e.cabang_utama_id
     LEFT JOIN edukator_mapel em ON em.edukator_id = e.id
     LEFT JOIN mapel m ON m.id = em.mapel_id
     ${whereClause}
     GROUP BY e.id
     ORDER BY e.created_at DESC`;
  const dataParams = [...whereParams];
  if (limit !== undefined) {
    dataQuery += " LIMIT ? OFFSET ?";
    dataParams.push(limit, offset || 0);
  }
  const [rows] = await db.query(dataQuery, dataParams);
  return { rows, total };
};

const getEdukatorById = async (id) => {
  const [rows] = await db.query(
    `SELECT e.id, e.user_id, e.nama, e.nik, e.telepon, e.alamat,
            e.pendidikan_terakhir, e.foto, e.cabang_utama_id, e.is_active,
            e.manajemen_id, mn.nama AS manajemen_nama,
            e.created_at, u.email,
            GROUP_CONCAT(m.id) as mapel_ids,
            GROUP_CONCAT(m.nama) as mapel_nama
     FROM edukator e
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN manajemen mn ON mn.id = e.manajemen_id
     LEFT JOIN edukator_mapel em ON em.edukator_id = e.id
     LEFT JOIN mapel m ON m.id = em.mapel_id
     WHERE e.id = ?
     GROUP BY e.id`,
    [id]
  );
  return rows[0] || null;
};

const createEdukator = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      email,
      password,
      cabang_utama_id,
      nama,
      nik,
      telepon,
      alamat,
      pendidikan_terakhir,
      foto,
      is_active,
      mapel_ids,
    } = payload;

    if (!email || !password || !nama) {
      throw new Error("Email, password, dan nama wajib diisi.");
    }

    const [existingEmail] = await conn.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (existingEmail.length) {
      throw new Error("Email sudah terdaftar.");
    }

    const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;
    const hashed = await bcrypt.hash(String(password), 10);

    const [userRes] = await conn.query(
      `INSERT INTO users (email, password, role, cabang_id, is_active)
       VALUES (?, ?, '${ROLES.EDUKATOR}', ?, ?)`,
      [email, hashed, cabang_utama_id, activeFlag]
    );

    const userId = userRes.insertId;

    const [edukatorRes] = await conn.query(
      `INSERT INTO edukator
        (user_id, nama, nik, telepon, alamat, pendidikan_terakhir, foto, cabang_utama_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        nama,
        nik || null,
        telepon || null,
        alamat || null,
        pendidikan_terakhir || null,
        foto || null,
        cabang_utama_id,
        activeFlag,
      ]
    );

    const mapelList = normalizeMapelIds(mapel_ids);
    for (const mapelId of mapelList) {
      await conn.query(
        "INSERT INTO edukator_mapel (edukator_id, mapel_id) VALUES (?, ?)",
        [edukatorRes.insertId, mapelId]
      );
    }

    await conn.commit();
    return { id: edukatorRes.insertId, user_id: userId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateEdukator = async (id, payload, existing) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (payload.email) {
      const [dupeRows] = await conn.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [payload.email, existing.user_id]
      );
      if (dupeRows.length) {
        throw new Error("Email sudah terdaftar.");
      }
      await conn.query("UPDATE users SET email = ? WHERE id = ?", [payload.email, existing.user_id]);
    }

    if (payload.password) {
      const hashed = await bcrypt.hash(String(payload.password), 10);
      await conn.query("UPDATE users SET password = ? WHERE id = ?", [
        hashed,
        existing.user_id,
      ]);
    }

    if (typeof payload.is_active !== "undefined") {
      await conn.query("UPDATE users SET is_active = ? WHERE id = ?", [
        payload.is_active ? 1 : 0,
        existing.user_id,
      ]);
    }

    await conn.query(
      `UPDATE edukator SET
        nama = ?, nik = ?, telepon = ?, alamat = ?, pendidikan_terakhir = ?, foto = ?, is_active = ?
       WHERE id = ?`,
      [
        payload.nama || existing.nama,
        payload.nik || existing.nik,
        payload.telepon || existing.telepon,
        payload.alamat || existing.alamat,
        payload.pendidikan_terakhir || existing.pendidikan_terakhir,
        typeof payload.foto !== "undefined" ? payload.foto : existing.foto,
        typeof payload.is_active !== "undefined" ? (payload.is_active ? 1 : 0) : existing.is_active,
        id,
      ]
    );

    if (typeof payload.mapel_ids !== "undefined") {
      await conn.query("DELETE FROM edukator_mapel WHERE edukator_id = ?", [id]);
      const mapelList = normalizeMapelIds(payload.mapel_ids);
      for (const mapelId of mapelList) {
        await conn.query(
          "INSERT INTO edukator_mapel (edukator_id, mapel_id) VALUES (?, ?)",
          [id, mapelId]
        );
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const deleteEdukator = async (id, userId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM edukator_mapel WHERE edukator_id = ?", [id]);
    await conn.query("DELETE FROM edukator WHERE id = ?", [id]);
    if (userId) {
      await conn.query("DELETE FROM users WHERE id = ?", [userId]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const getEdukatorIdByUserId = async (userId) => {
  const [rows] = await db.query(
    "SELECT id FROM edukator WHERE user_id = ? LIMIT 1",
    [userId]
  );
  return rows[0] ? rows[0].id : null;
};

const getProfileByUserId = async (userId) => {
  const [rows] = await db.query(
    `SELECT e.id, e.user_id, e.nama, e.nik, e.telepon, e.alamat,
            e.pendidikan_terakhir, e.foto, e.cabang_utama_id, e.is_active,
            u.email
     FROM edukator e
     LEFT JOIN users u ON u.id = e.user_id
     WHERE e.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const updateProfileByUserId = async (userId, payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT e.id, e.user_id, e.nama, e.nik, e.telepon, e.alamat,
              e.pendidikan_terakhir, e.foto, e.is_active, u.email
       FROM edukator e
       LEFT JOIN users u ON u.id = e.user_id
       WHERE e.user_id = ?
       LIMIT 1`,
      [userId]
    );

    const existing = rows[0];
    if (!existing) {
      await conn.rollback();
      return null;
    }

    if (payload.email && payload.email !== existing.email) {
      const [emailRows] = await conn.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [payload.email, existing.user_id]
      );
      if (emailRows.length) {
        throw new Error("Email sudah digunakan.");
      }
      await conn.query("UPDATE users SET email = ? WHERE id = ?", [
        payload.email,
        existing.user_id,
      ]);
    }

    if (payload.password) {
      if (String(payload.password).length < 6) {
        throw new Error("Password minimal 6 karakter.");
      }
      const hashed = await bcrypt.hash(String(payload.password), 10);
      await conn.query("UPDATE users SET password = ? WHERE id = ?", [
        hashed,
        existing.user_id,
      ]);
    }

    await conn.query(
      `UPDATE edukator SET
        nama = ?, nik = ?, telepon = ?, alamat = ?, pendidikan_terakhir = ?, foto = ?
       WHERE user_id = ?`,
      [
        payload.nama || existing.nama,
        payload.nik || existing.nik,
        payload.telepon || existing.telepon,
        payload.alamat || existing.alamat,
        payload.pendidikan_terakhir || existing.pendidikan_terakhir,
        typeof payload.foto !== "undefined" ? payload.foto : existing.foto,
        existing.user_id,
      ]
    );

    await conn.commit();
    return getProfileByUserId(userId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const getRekapPresensi = async (edukatorId, cabangId, year, month) => {
  const params = [edukatorId, year, month];
  const cabangFilter = cabangId ? " AND j.cabang_id = ?" : "";
  if (cabangId) params.push(cabangId);

  const [summary] = await db.query(
    `SELECT
      COUNT(DISTINCT j.id) AS total_jadwal_terjadwal,
      COUNT(DISTINCT CASE WHEN j.status_jadwal = '${JADWAL_STATUS.COMPLETED}' THEN j.id END) AS total_jadwal_selesai,
      COUNT(DISTINCT p.id) AS total_presensi
    FROM jadwal j
    LEFT JOIN presensi p ON p.jadwal_id = j.id
    WHERE j.edukator_id = ?
      AND YEAR(j.tanggal) = ?
      AND MONTH(j.tanggal) = ?
      ${cabangFilter}`,
    params
  );

  const weekParams = [edukatorId, year, month];
  if (cabangId) weekParams.push(cabangId);

  const [weekBreakdown] = await db.query(
    `SELECT
      WEEK(j.tanggal, 1) - WEEK(DATE_FORMAT(j.tanggal, '%Y-%m-01'), 1) + 1 AS minggu_ke,
      COUNT(DISTINCT j.id) AS total_jadwal,
      COUNT(DISTINCT p.id) AS total_presensi
    FROM jadwal j
    LEFT JOIN presensi p ON p.jadwal_id = j.id
    WHERE j.edukator_id = ?
      AND YEAR(j.tanggal) = ?
      AND MONTH(j.tanggal) = ?
      ${cabangFilter}
    GROUP BY minggu_ke
    ORDER BY minggu_ke`,
    weekParams
  );

  const programParams = [edukatorId, year, month];
  if (cabangId) programParams.push(cabangId);

  const [programBreakdown] = await db.query(
    `SELECT
      pr.nama AS program_nama,
      COUNT(DISTINCT j.id) AS total_jadwal,
      COUNT(DISTINCT p.id) AS total_presensi
    FROM jadwal j
    LEFT JOIN program pr ON pr.id = j.program_id
    LEFT JOIN presensi p ON p.jadwal_id = j.id
    WHERE j.edukator_id = ?
      AND YEAR(j.tanggal) = ?
      AND MONTH(j.tanggal) = ?
      ${cabangFilter}
    GROUP BY pr.id
    ORDER BY total_jadwal DESC`,
    programParams
  );

  const missingParams = [edukatorId, year, month];
  if (cabangId) missingParams.push(cabangId);

  const [missingPresensi] = await db.query(
    `SELECT
      j.id AS jadwal_id,
      j.tanggal,
      j.jam_mulai,
      COALESCE(s.nama, k.nama) AS siswa_nama,
      pr.nama AS program_nama
    FROM jadwal j
    LEFT JOIN presensi p ON p.jadwal_id = j.id
    LEFT JOIN enrollment en ON en.id = j.enrollment_id
    LEFT JOIN siswa s ON s.id = en.siswa_id
    LEFT JOIN kelas k ON k.id = j.kelas_id
    LEFT JOIN program pr ON pr.id = j.program_id
    WHERE j.edukator_id = ?
      AND YEAR(j.tanggal) = ?
      AND MONTH(j.tanggal) = ?
      ${cabangFilter}
      AND p.id IS NULL
      AND j.tanggal <= CURDATE()
    ORDER BY j.tanggal DESC`,
    missingParams
  );

  const persentaseKehadiran = summary[0].total_jadwal_terjadwal > 0
    ? ((summary[0].total_presensi / summary[0].total_jadwal_terjadwal) * 100).toFixed(2)
    : "0.00";

  return {
    summary: {
      ...summary[0],
      persentase_kehadiran: persentaseKehadiran
    },
    breakdown_by_week: weekBreakdown,
    breakdown_by_program: programBreakdown,
    jadwal_tidak_presensi: missingPresensi
  };
};

// Helper: Check if period is current or past (not future)
// Management salary only counts for periods that have started
const isPeriodStarted = (targetYear, targetMonth) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const yr = Number(targetYear);
  const mo = Number(targetMonth);

  // Future year
  if (yr > currentYear) return false;
  // Same year, future month
  if (yr === currentYear && mo > currentMonth) return false;

  return true;
};

// Get detailed salary breakdown for edukator
const getRincianGaji = async (edukatorId, cabangId, year, month) => {
  // Get edukator info
  const [edukatorInfo] = await db.query(
    `SELECT e.id, e.nama, e.pendidikan_terakhir, e.manajemen_id,
            m.nama AS jabatan_manajemen, m.gaji_tambahan
     FROM edukator e
     LEFT JOIN manajemen m ON m.id = e.manajemen_id
     WHERE e.id = ?`,
    [edukatorId]
  );

  if (!edukatorInfo.length) {
    throw new Error("Edukator tidak ditemukan.");
  }

  const edukator = edukatorInfo[0];

  // Build filters
  const params = [edukatorId, year, month];
  const cabangFilter = cabangId ? " AND gt.cabang_id = ?" : "";
  if (cabangId) params.push(cabangId);

  // Get summary totals (including transport breakdown)
  const [summaryRows] = await db.query(
    `SELECT
      COALESCE(SUM(gt.nominal), 0) AS total_gaji_mengajar,
      COALESCE(SUM(gt.transport_edukator), 0) AS total_transport,
      COUNT(gt.id) AS total_pertemuan
    FROM gaji_transaksi gt
    WHERE gt.edukator_id = ?
      AND YEAR(gt.created_at) = ?
      AND MONTH(gt.created_at) = ?
      ${cabangFilter}`,
    params
  );

  const gajiMengajar = Number(summaryRows[0]?.total_gaji_mengajar || 0);
  const totalTransport = Number(summaryRows[0]?.total_transport || 0);
  // Gaji pokok = total gaji mengajar - transport (karena transport sudah termasuk di nominal)
  const gajiPokok = gajiMengajar - totalTransport;
  // Gaji manajemen hanya dihitung jika periode sudah berjalan (bukan bulan depan)
  const gajiTambahan = isPeriodStarted(year, month) ? Number(edukator.gaji_tambahan || 0) : 0;
  // Infaq (potongan) per periode
  const infaqParams = [edukatorId, year, month];
  const infaqFilter = cabangId ? " AND cabang_id = ?" : "";
  if (cabangId) infaqParams.push(cabangId);

  const [infaqRows] = await db.query(
    `SELECT id, jenis_infaq, nominal, keterangan, tanggal, created_at
     FROM gaji_infaq
     WHERE edukator_id = ?
       AND YEAR(tanggal) = ?
       AND MONTH(tanggal) = ?
       ${infaqFilter}
     ORDER BY tanggal DESC, id DESC`,
    infaqParams
  );

  const totalInfaq = (infaqRows || []).reduce((sum, row) => sum + Number(row.nominal || 0), 0);
  const totalGaji = gajiMengajar + gajiTambahan - totalInfaq;

  // Get breakdown by program and jenjang
  const breakdownParams = [edukatorId, year, month];
  if (cabangId) breakdownParams.push(cabangId);

  const [breakdownByProgram] = await db.query(
    `SELECT
      j.tipe_les,
      gt.jenjang,
      COALESCE(pr.nama, 'Program Lain') AS program_nama,
      COUNT(gt.id) AS jumlah_pertemuan,
      SUM(gt.nominal) AS total_gaji
    FROM gaji_transaksi gt
    JOIN jadwal j ON j.id = gt.jadwal_id
    LEFT JOIN enrollment en ON en.id = j.enrollment_id
    LEFT JOIN program pr ON pr.id = COALESCE(en.program_id, j.program_id)
    WHERE gt.edukator_id = ?
      AND YEAR(gt.created_at) = ?
      AND MONTH(gt.created_at) = ?
      ${cabangFilter}
    GROUP BY j.tipe_les, gt.jenjang, COALESCE(pr.id, 0), pr.nama
    ORDER BY j.tipe_les, gt.jenjang, program_nama`,
    breakdownParams
  );

  // Get breakdown by tipe_les only
  const [breakdownByTipe] = await db.query(
    `SELECT
      j.tipe_les,
      COUNT(gt.id) AS jumlah_pertemuan,
      SUM(gt.nominal) AS total_gaji
    FROM gaji_transaksi gt
    JOIN jadwal j ON j.id = gt.jadwal_id
    WHERE gt.edukator_id = ?
      AND YEAR(gt.created_at) = ?
      AND MONTH(gt.created_at) = ?
      ${cabangFilter}
    GROUP BY j.tipe_les
    ORDER BY j.tipe_les`,
    breakdownParams
  );

  // Get individual transactions (last 50)
  const detailParams = [edukatorId, year, month];
  if (cabangId) detailParams.push(cabangId);

  const [transactions] = await db.query(
    `SELECT
      gt.id,
      gt.nominal,
      gt.transport_edukator,
      gt.jenjang,
      gt.created_at AS tanggal,
      j.tanggal AS tanggal_jadwal,
      j.jam_mulai,
      j.jam_selesai,
      j.tipe_les,
      COALESCE(s.nama, k.nama) AS siswa_nama,
      COALESCE(pr.nama, 'Program Lain') AS program_nama
    FROM gaji_transaksi gt
    JOIN jadwal j ON j.id = gt.jadwal_id
    LEFT JOIN enrollment en ON en.id = j.enrollment_id
    LEFT JOIN siswa s ON s.id = en.siswa_id
    LEFT JOIN kelas k ON k.id = j.kelas_id
    LEFT JOIN program pr ON pr.id = COALESCE(en.program_id, j.program_id)
    WHERE gt.edukator_id = ?
      AND YEAR(gt.created_at) = ?
      AND MONTH(gt.created_at) = ?
      ${cabangFilter}
    ORDER BY j.tanggal DESC, j.jam_mulai DESC
    LIMIT 100`,
    detailParams
  );

  return {
    edukator: {
      id: edukator.id,
      nama: edukator.nama,
      pendidikan_terakhir: edukator.pendidikan_terakhir,
      jabatan_manajemen: edukator.jabatan_manajemen,
    },
    periode: {
      year,
      month,
    },
    summary: {
      gaji_pokok: gajiPokok,
      transport: totalTransport,
      gaji_mengajar: gajiMengajar,
      gaji_tambahan: gajiTambahan,
      total_infaq: totalInfaq,
      total_gaji: totalGaji,
      total_pertemuan: Number(summaryRows[0]?.total_pertemuan || 0),
    },
    infaq: infaqRows || [],
    breakdown_by_tipe: breakdownByTipe,
    breakdown_by_program: breakdownByProgram,
    transactions,
  };
};

const getTopHistory = async (cabangId, year, month, limit = 5) => {
  const params = [year, month, year, month, year, month];
  const cabangFilter = cabangId ? "WHERE e.cabang_utama_id = ?" : "";
  if (cabangId) params.push(cabangId);
  params.push(Number(limit) || 5);

  const [rows] = await db.query(
    `SELECT
      e.id,
      e.nama,
      u.email,
      c.nama AS cabang_nama,
      COALESCE(j.total_jam, 0) AS total_jam,
      COALESCE(gt.total_gaji, 0) AS total_gaji,
      COALESCE(p.total_kehadiran, 0) AS total_kehadiran
    FROM edukator e
    LEFT JOIN users u ON u.id = e.user_id
    LEFT JOIN cabang c ON c.id = e.cabang_utama_id
    LEFT JOIN (
      SELECT
        edukator_id,
        SUM(TIMESTAMPDIFF(MINUTE, jam_mulai, jam_selesai)) / 60 AS total_jam
      FROM jadwal
      WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?
        AND status_jadwal = '${JADWAL_STATUS.COMPLETED}'
      GROUP BY edukator_id
    ) j ON j.edukator_id = e.id
    LEFT JOIN (
      SELECT
        edukator_id,
        COUNT(*) AS total_kehadiran
      FROM presensi
      WHERE YEAR(waktu_absen) = ? AND MONTH(waktu_absen) = ?
      GROUP BY edukator_id
    ) p ON p.edukator_id = e.id
    LEFT JOIN (
      SELECT
        edukator_id,
        SUM(nominal) AS total_gaji
      FROM gaji_transaksi
      WHERE YEAR(created_at) = ? AND MONTH(created_at) = ?
      GROUP BY edukator_id
    ) gt ON gt.edukator_id = e.id
    ${cabangFilter}
    ORDER BY COALESCE(j.total_jam, 0) DESC, COALESCE(gt.total_gaji, 0) DESC, COALESCE(p.total_kehadiran, 0) DESC
    LIMIT ?`,
    params
  );

  return rows;
};

module.exports = {
  listEdukator,
  getEdukatorById,
  createEdukator,
  updateEdukator,
  deleteEdukator,
  getEdukatorIdByUserId,
  getProfileByUserId,
  updateProfileByUserId,
  getRekapPresensi,
  getRincianGaji,
  getTopHistory,
};
