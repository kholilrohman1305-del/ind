const bcrypt = require("bcryptjs");
const db = require("../db");
const tagihanService = require("./tagihan.service");
const { ENROLLMENT_STATUS, JADWAL_STATUS, TAGIHAN_STATUS, TIPE_LES, ROLES } = require("../config/constants");

const listSiswa = async (cabangId, { limit, offset } = {}) => {
  // Optimized query with pre-aggregated JOINs instead of scalar subqueries
  const baseQuery = `
    SELECT s.id, s.user_id, s.cabang_id, c.nama AS cabang_nama, s.nama, s.nik, s.telepon, s.alamat,
           s.tanggal_lahir, s.sekolah_asal, s.jenjang, s.kelas, s.foto, s.is_active, s.status_pendaftaran,
           s.program_id, p.nama AS program_nama, p.tipe_les,
           s.preferred_days, s.preferred_jam_mulai, s.preferred_jam_selesai, s.tanggal_mulai_belajar,
           s.created_at, u.email,
           COALESCE(prog_aktif.program_list, '') AS program_list,
           prog_aktif.program_tipe_les,
           COALESCE(enroll_latest.total_pertemuan, 0) AS total_pertemuan,
           COALESCE(enroll_latest.sisa_pertemuan, 0) AS sisa_pertemuan,
           enroll_any.status_enrollment,
           COALESCE(jadwal_done.pertemuan_selesai, 0) AS pertemuan_selesai,
           COALESCE(jadwal_all.total_jadwal, 0) AS total_jadwal,
           COALESCE(mapel_agg.mapel_list, '') AS mapel_list,
           COALESCE(tagihan_agg.sisa_tagihan, 0) AS sisa_tagihan,
           COALESCE(tagihan_agg.tagihan_belum_lunas, 0) AS tagihan_belum_lunas
    FROM siswa s
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN cabang c ON c.id = s.cabang_id
    LEFT JOIN program p ON p.id = s.program_id
    -- Program list dari enrollment aktif
    LEFT JOIN (
      SELECT en2.siswa_id,
             GROUP_CONCAT(DISTINCT p2.nama ORDER BY p2.nama SEPARATOR ', ') AS program_list,
             MAX(p2.tipe_les) AS program_tipe_les
      FROM enrollment en2
      JOIN program p2 ON p2.id = en2.program_id
      WHERE en2.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
      GROUP BY en2.siswa_id
    ) prog_aktif ON prog_aktif.siswa_id = s.id
    -- Latest enrollment aktif
    LEFT JOIN (
      SELECT en3.siswa_id, en3.total_pertemuan, en3.sisa_pertemuan
      FROM enrollment en3
      WHERE en3.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
      GROUP BY en3.siswa_id
      HAVING en3.id = MAX(en3.id)
    ) enroll_latest ON enroll_latest.siswa_id = s.id
    -- Latest enrollment any status
    LEFT JOIN (
      SELECT en5.siswa_id, en5.status_enrollment
      FROM enrollment en5
      WHERE en5.id = (
        SELECT MAX(en5b.id) FROM enrollment en5b WHERE en5b.siswa_id = en5.siswa_id
      )
      GROUP BY en5.siswa_id
    ) enroll_any ON enroll_any.siswa_id = s.id
    -- Pertemuan selesai
    LEFT JOIN (
      SELECT en6.siswa_id, COUNT(DISTINCT j.id) AS pertemuan_selesai
      FROM enrollment en6
      JOIN jadwal j ON j.enrollment_id = en6.id
      JOIN presensi pr ON pr.jadwal_id = j.id
      WHERE en6.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
        AND j.status_jadwal = '${JADWAL_STATUS.COMPLETED}'
      GROUP BY en6.siswa_id
    ) jadwal_done ON jadwal_done.siswa_id = s.id
    -- Total jadwal
    LEFT JOIN (
      SELECT en7.siswa_id, COUNT(j2.id) AS total_jadwal
      FROM enrollment en7
      JOIN jadwal j2 ON j2.enrollment_id = en7.id
      WHERE en7.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
      GROUP BY en7.siswa_id
    ) jadwal_all ON jadwal_all.siswa_id = s.id
    -- Mapel list
    LEFT JOIN (
      SELECT sm.siswa_id, GROUP_CONCAT(DISTINCT m.nama ORDER BY m.nama SEPARATOR ', ') AS mapel_list
      FROM siswa_mapel sm
      JOIN mapel m ON m.id = sm.mapel_id
      GROUP BY sm.siswa_id
    ) mapel_agg ON mapel_agg.siswa_id = s.id
    -- Sisa tagihan
    LEFT JOIN (
      SELECT en8.siswa_id,
             SUM(GREATEST(t.nominal - COALESCE(pb_agg.total_bayar, 0), 0)) AS sisa_tagihan,
             COUNT(DISTINCT t.id) AS tagihan_belum_lunas
      FROM enrollment en8
      JOIN tagihan t ON t.enrollment_id = en8.id
      LEFT JOIN (
        SELECT pb.tagihan_id, SUM(pb.nominal) AS total_bayar
        FROM pembayaran pb
        GROUP BY pb.tagihan_id
      ) pb_agg ON pb_agg.tagihan_id = t.id
      WHERE t.status_tagihan != '${TAGIHAN_STATUS.LUNAS}'
      GROUP BY en8.siswa_id
    ) tagihan_agg ON tagihan_agg.siswa_id = s.id
  `;

  const whereClause = cabangId ? "WHERE s.cabang_id = ?" : "";
  const whereParams = cabangId ? [cabangId] : [];

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM siswa s ${whereClause}`,
    whereParams
  );

  let dataQuery = `${baseQuery} ${whereClause} ORDER BY s.created_at DESC`;
  const dataParams = [...whereParams];

  if (limit !== undefined) {
    dataQuery += " LIMIT ? OFFSET ?";
    dataParams.push(limit, offset || 0);
  }

  const [rows] = await db.query(dataQuery, dataParams);
  return { rows, total };
};

const getSiswaById = async (id) => {
  const [rows] = await db.query(
    `SELECT s.id, s.user_id, s.cabang_id, s.nama, s.nik, s.telepon, s.alamat,
            s.tanggal_lahir, s.sekolah_asal, s.jenjang, s.kelas, s.foto, s.is_active,
            s.created_at, u.email, en_active.program_id,
            p_active.nama AS program_nama,
            (SELECT GROUP_CONCAT(DISTINCT p2.nama ORDER BY p2.nama SEPARATOR ', ')
             FROM enrollment en2
             JOIN program p2 ON p2.id = en2.program_id
             WHERE en2.siswa_id = s.id AND en2.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}') AS program_list
     FROM siswa s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN enrollment en_active
       ON en_active.id = (
         SELECT en3.id
         FROM enrollment en3
         WHERE en3.siswa_id = s.id AND en3.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
         ORDER BY en3.created_at DESC, en3.id DESC
         LIMIT 1
       )
     LEFT JOIN program p_active ON p_active.id = en_active.program_id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const getProfileByUserId = async (userId) => {
  const [rows] = await db.query(
    `SELECT s.id, s.user_id, s.cabang_id, s.nama, s.kelas, s.jenjang, s.foto,
            s.telepon, s.alamat, s.sekolah_asal, s.tanggal_lahir,
            u.email
     FROM siswa s
     LEFT JOIN users u ON u.id = s.user_id
     WHERE s.user_id = ?
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
};

const listProgramsByUserId = async (userId) => {
  const [rows] = await db.query(
    `SELECT en.id AS enrollment_id, en.program_id, en.status_enrollment,
            en.tanggal_daftar, en.total_pertemuan, en.sisa_pertemuan,
            p.nama AS program_nama, p.tipe_les, p.jenjang, p.jumlah_pertemuan,
            p.harga, p.deskripsi,
            (SELECT COUNT(DISTINCT pr.id)
             FROM jadwal j
             LEFT JOIN presensi pr ON pr.jadwal_id = j.id
             WHERE j.enrollment_id = en.id AND pr.id IS NOT NULL
            ) AS completed_jadwal,
            (SELECT COUNT(*)
             FROM jadwal j2
             WHERE j2.enrollment_id = en.id
            ) AS total_jadwal,
            (SELECT COALESCE(SUM(CASE WHEN t.status_tagihan = '${TAGIHAN_STATUS.LUNAS}' THEN 1 ELSE 0 END), 0)
             FROM tagihan t
             WHERE t.enrollment_id = en.id
            ) AS tagihan_lunas_count,
            (SELECT COUNT(*)
             FROM tagihan t2
             WHERE t2.enrollment_id = en.id
            ) AS tagihan_total_count
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     WHERE s.user_id = ?
     ORDER BY en.created_at DESC, en.id DESC`,
    [userId]
  );

  // Add derived fields for frontend convenience
  return rows.map((row) => ({
    ...row,
    jadwal_selesai: Number(row.total_jadwal) > 0 && Number(row.completed_jadwal) >= Number(row.total_pertemuan),
    tagihan_lunas: Number(row.tagihan_total_count) > 0 && Number(row.tagihan_lunas_count) >= Number(row.tagihan_total_count),
    can_renew: (
      Number(row.total_jadwal) > 0 &&
      Number(row.completed_jadwal) >= Number(row.total_pertemuan) &&
      Number(row.tagihan_total_count) > 0 &&
      Number(row.tagihan_lunas_count) >= Number(row.tagihan_total_count)
    )
  }));
};

const getTagihanSummaryByUserId = async (userId) => {
  const [rows] = await db.query(
    `SELECT en.id AS enrollment_id,
            p.nama AS program_nama,
            SUM(t.nominal) AS total_tagihan,
            IFNULL(SUM(pb.nominal), 0) AS total_bayar,
            MIN(t.tanggal_jatuh_tempo) AS jatuh_tempo_terdekat
     FROM siswa s
     JOIN enrollment en ON en.siswa_id = s.id
     JOIN program p ON p.id = en.program_id
     JOIN tagihan t ON t.enrollment_id = en.id
     LEFT JOIN pembayaran pb ON pb.tagihan_id = t.id
     WHERE s.user_id = ?
       AND t.status_tagihan <> '${TAGIHAN_STATUS.LUNAS}'
     GROUP BY en.id, p.nama
     ORDER BY jatuh_tempo_terdekat ASC`,
    [userId]
  );

  const items = rows.map((row) => {
    const totalTagihan = Number(row.total_tagihan || 0);
    const totalBayar = Number(row.total_bayar || 0);
    const sisa = Math.max(totalTagihan - totalBayar, 0);
    return {
      enrollment_id: row.enrollment_id,
      program_nama: row.program_nama,
      total_tagihan: totalTagihan,
      total_bayar: totalBayar,
      sisa_tagihan: sisa,
      tanggal_jatuh_tempo: row.jatuh_tempo_terdekat,
    };
  }).filter((item) => item.sisa_tagihan > 0);

  const totalSisa = items.reduce((acc, item) => acc + item.sisa_tagihan, 0);

  return { total_sisa: totalSisa, items };
};

const getRecommendedProgramsByUserId = async (userId) => {
  const [siswaRows] = await db.query(
    "SELECT id, cabang_id, jenjang FROM siswa WHERE user_id = ? LIMIT 1",
    [userId]
  );
  const siswa = siswaRows[0];
  if (!siswa) return [];

  const params = [siswa.cabang_id];
  let jenjangFilter = "";
  if (siswa.jenjang) {
    jenjangFilter = " AND (p.jenjang = ? OR p.jenjang IS NULL)";
    params.push(siswa.jenjang);
  }

  const [rows] = await db.query(
    `SELECT p.id, p.nama AS program_nama, p.tipe_les, p.jenjang, p.jumlah_pertemuan,
            p.harga, p.deskripsi
     FROM program p
     WHERE p.cabang_id = ? AND p.is_active = 1${jenjangFilter}
     ORDER BY p.created_at DESC
     LIMIT 12`,
    params
  );
  return rows;
};

const renewProgramByUserId = async ({ userId, programId, startDate }) => {
  const [siswaRows] = await db.query(
    "SELECT id, cabang_id FROM siswa WHERE user_id = ? LIMIT 1",
    [userId]
  );
  const siswa = siswaRows[0];
  if (!siswa) throw new Error("Siswa tidak ditemukan.");
  return renewProgram({ siswaId: siswa.id, programId, startDate, cabangId: siswa.cabang_id });
};

const updateProfileByUserId = async (userId, payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [rows] = await conn.query(
      `SELECT s.id, s.user_id, s.nama, s.kelas, s.jenjang, s.foto,
              s.telepon, s.alamat, s.sekolah_asal, s.tanggal_lahir,
              u.email
       FROM siswa s
       LEFT JOIN users u ON u.id = s.user_id
       WHERE s.user_id = ?
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
      `UPDATE siswa SET
        nama = ?, kelas = ?, jenjang = ?, telepon = ?, alamat = ?,
        sekolah_asal = ?, tanggal_lahir = ?, foto = ?
       WHERE user_id = ?`,
      [
        payload.nama || existing.nama,
        payload.kelas || existing.kelas,
        payload.jenjang || existing.jenjang,
        payload.telepon || existing.telepon,
        payload.alamat || existing.alamat,
        payload.sekolah_asal || existing.sekolah_asal,
        payload.tanggal_lahir || existing.tanggal_lahir,
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


const getFixedPattern = (count) => {
  const mapping = {
    5: [1, 2, 3, 4, 5],
    4: [1, 2, 4, 5],
    3: [1, 3, 5],
    2: [2, 4],
    1: [1],
  };
  return mapping[count] || mapping[1];
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const hasConflict = async (conn, { tanggal, jam_mulai, jam_selesai, edukator_id, siswa_id }) => {
  const params = [tanggal, jam_selesai, jam_mulai];
  let where = "WHERE tanggal = ? AND jam_mulai < ? AND jam_selesai > ?";

  if (edukator_id && siswa_id) {
    where +=
      " AND (edukator_id = ? OR enrollment_id IN (SELECT id FROM enrollment WHERE siswa_id = ?))";
    params.push(Number(edukator_id), Number(siswa_id));
  } else if (edukator_id) {
    where += " AND edukator_id = ?";
    params.push(Number(edukator_id));
  } else if (siswa_id) {
    where += " AND enrollment_id IN (SELECT id FROM enrollment WHERE siswa_id = ?)";
    params.push(Number(siswa_id));
  } else {
    return false;
  }

  const [rows] = await conn.query(`SELECT id FROM jadwal ${where} LIMIT 1`, params);
  return rows.length > 0;
};

const resolveConflictDate = async (conn, payload) => {
  if (!payload.tanggal) return null;
  const base = new Date(`${payload.tanggal}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;
  for (let i = 0; i < 8; i += 1) {
    const target = new Date(base);
    target.setDate(target.getDate() + i * 7);
    const targetDate = formatDate(target);
    const conflict = await hasConflict(conn, { ...payload, tanggal: targetDate });
    if (!conflict) return targetDate;
  }
  return null;
};

const getDefaultEdukatorForMapel = async (conn, cabangId, mapelId) => {
  if (!cabangId || !mapelId) return null;
  const [rows] = await conn.query(
    `SELECT e.id
     FROM edukator e
     JOIN edukator_mapel em ON em.edukator_id = e.id
     WHERE e.cabang_utama_id = ?
       AND e.is_active = 1
       AND em.mapel_id = ?
     ORDER BY e.created_at ASC, e.id ASC
     LIMIT 1`,
    [cabangId, mapelId]
  );
  return rows[0]?.id || null;
};

const autoCreatePrivatSchedule = async (
  conn,
  { enrollmentId, program, siswaId, cabangId, startDate, preferredEdukatorId }
) => {
  if (!program || program.tipe_les === TIPE_LES.KELAS) return 0;
  const totalPertemuan = Number(program.jumlah_pertemuan || 0);
  if (!totalPertemuan) return 0;

  const finalCabangId = cabangId || program.cabang_id;
  const [templateRows] = await conn.query(
    `SELECT j.tanggal, j.jam_mulai, j.jam_selesai, j.edukator_id, j.mapel_id
     FROM jadwal j
     JOIN enrollment en ON en.id = j.enrollment_id
     JOIN siswa s ON s.id = en.siswa_id
     WHERE j.tipe_les != '${TIPE_LES.KELAS}'
       AND en.program_id = ?
       AND s.cabang_id = ?
     ORDER BY j.tanggal ASC, j.jam_mulai ASC, j.id ASC`,
    [program.id, finalCabangId]
  );

  if (!templateRows.length) return 0;

  const baseDate = startDate
    ? new Date(`${startDate}T00:00:00`)
    : new Date();
  if (Number.isNaN(baseDate.getTime())) {
    return 0;
  }
  baseDate.setHours(0, 0, 0, 0);

  const templateBase = templateRows.find((row) => row.tanggal)?.tanggal;
  const templateBaseDate = templateBase
    ? new Date(`${templateBase}T00:00:00`)
    : baseDate;
  const diffDays = Math.round((baseDate - templateBaseDate) / (24 * 60 * 60 * 1000));

  const values = [];
  let lastDate = null;
  for (let i = 0; i < totalPertemuan; i += 1) {
    const source = templateRows[i] || templateRows[templateRows.length - 1];
    const mapelId = source.mapel_id || program.mapel_id;
    if (!mapelId) continue;

    let edukatorId = preferredEdukatorId || source.edukator_id;
    if (!edukatorId) {
      edukatorId = await getDefaultEdukatorForMapel(conn, finalCabangId, mapelId);
    }
    if (!edukatorId) continue;

    if (!source.jam_mulai || !source.jam_selesai) continue;

    let tanggal = null;
    if (source.tanggal) {
      const sourceDate = new Date(`${source.tanggal}T00:00:00`);
      const targetDate = new Date(sourceDate);
      targetDate.setDate(targetDate.getDate() + diffDays);
      tanggal = formatDate(targetDate);
      lastDate = targetDate;
    } else {
      const base = lastDate || baseDate;
      const nextDate = new Date(base);
      nextDate.setDate(nextDate.getDate() + (i === 0 ? 0 : 7));
      tanggal = formatDate(nextDate);
      lastDate = nextDate;
    }

    const resolvedDate = await resolveConflictDate(conn, {
      tanggal,
      jam_mulai: source.jam_mulai,
      jam_selesai: source.jam_selesai,
      edukator_id: edukatorId,
      siswa_id: siswaId,
    });

    if (!resolvedDate) continue;

    values.push([
      finalCabangId,
      enrollmentId,
      program.id,
      Number(edukatorId),
      Number(mapelId),
      TIPE_LES.PRIVAT,
      resolvedDate,
      source.jam_mulai,
      source.jam_selesai,
      JADWAL_STATUS.SCHEDULED,
    ]);
  }

  if (!values.length) return 0;

  await conn.query(
    `INSERT INTO jadwal
      (cabang_id, enrollment_id, program_id, edukator_id, mapel_id, tipe_les,
       tanggal, jam_mulai, jam_selesai, status_jadwal)
     VALUES ?`,
    [values]
  );

  return values.length;
};

const attachEnrollmentToKelasSchedule = async (conn, { enrollmentId, program }) => {
  if (!program || program.tipe_les !== TIPE_LES.KELAS) return 0;
  const totalPertemuan = Number(program.jumlah_pertemuan || 1);

  const [kelasRows] = await conn.query(
    `SELECT k.id
     FROM kelas_program kp
     JOIN kelas k ON k.id = kp.kelas_id
     JOIN jadwal j ON j.kelas_id = k.id AND j.tipe_les = '${TIPE_LES.KELAS}'
     WHERE kp.program_id = ?
     GROUP BY k.id
     ORDER BY MAX(j.tanggal) DESC
     LIMIT 1`,
    [program.id]
  );
  const kelasId = kelasRows[0]?.id;
  if (!kelasId) return 0;

  const [jadwalRows] = await conn.query(
    `SELECT id, tanggal, jam_mulai
     FROM jadwal
     WHERE kelas_id = ? AND tipe_les = '${TIPE_LES.KELAS}' AND tanggal >= CURDATE()
     ORDER BY tanggal ASC, jam_mulai ASC, id ASC`,
    [kelasId]
  );
  if (!jadwalRows.length) return 0;

  const patternDays = getFixedPattern(totalPertemuan);
  let pertemuanKe = 0;
  const values = [];

  jadwalRows.forEach((row) => {
    if (pertemuanKe >= totalPertemuan) return;
    const dayIndex = new Date(`${row.tanggal}T00:00:00`).getDay();
    if (!patternDays.includes(dayIndex)) return;
    pertemuanKe += 1;
    values.push([row.id, enrollmentId, pertemuanKe, "belum"]);
  });

  if (!values.length) return 0;

  await conn.query(
    `INSERT IGNORE INTO jadwal_kelas_siswa (jadwal_id, enrollment_id, pertemuan_ke, status)
     VALUES ?`,
    [values]
  );

  return values.length;
};

// Sync siswa_mapel junction table
const syncSiswaMapel = async (conn, siswaId, mapelIds) => {
  // Delete existing
  await conn.query("DELETE FROM siswa_mapel WHERE siswa_id = ?", [siswaId]);

  // Insert new
  if (mapelIds && mapelIds.length > 0) {
    const values = mapelIds.map(mapelId => [siswaId, Number(mapelId)]);
    await conn.query(
      "INSERT INTO siswa_mapel (siswa_id, mapel_id) VALUES ?",
      [values]
    );
  }
};

const autoHandleEnrollmentScheduling = async (conn, { enrollmentId, program, siswaId, cabangId, startDate, preferredEdukatorId }) => {
  if (!program || !enrollmentId) return;

  let jadwalCreated = 0;

  if (program.tipe_les === TIPE_LES.PRIVAT) {
    jadwalCreated = await autoCreatePrivatSchedule(conn, {
      enrollmentId,
      program,
      siswaId,
      cabangId,
      startDate,
      preferredEdukatorId,
    });
  } else if (program.tipe_les === TIPE_LES.KELAS) {
    jadwalCreated = await attachEnrollmentToKelasSchedule(conn, { enrollmentId, program });
  }

  // Jika jadwal berhasil dibuat, update status enrollment ke 'aktif'
  if (jadwalCreated > 0) {
    await conn.query(
      `UPDATE enrollment SET status_enrollment = '${ENROLLMENT_STATUS.AKTIF}' WHERE id = ?`,
      [enrollmentId]
    );
  }
  // Jika tidak ada jadwal dibuat, status tetap 'menunggu_jadwal'
  // Admin perlu membuat jadwal manual melalui menu Jadwal
};

const createSiswa = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      email,
      password,
      cabang_id,
      program_id,
      nama,
      nik,
      telepon,
      alamat,
      tanggal_lahir,
      sekolah_asal,
      jenjang,
      kelas,
      foto,
      is_active,
      edukator_id,
      mapel_ids, // Mapel selection
    } = payload;

    if (!email || !password || !nama) {
      throw new Error("Email, password, dan nama wajib diisi.");
    }
    if (!program_id) {
      throw new Error("Program wajib dipilih.");
    }

    const [existingEmail] = await conn.query(
      "SELECT id FROM users WHERE email = ? LIMIT 1",
      [email]
    );
    if (existingEmail.length) {
      throw new Error("Email sudah terdaftar.");
    }

    // 1. Ambil Data Program Terlebih Dahulu
    const [programRows] = await conn.query(
      "SELECT id, cabang_id, tipe_les, jumlah_pertemuan, mapel_id FROM program WHERE id = ?",
      [program_id]
    );
    const program = programRows[0];
    if (!program) {
      throw new Error("Program tidak ditemukan.");
    }

    // Gunakan cabang dari program sebagai source of truth
    const finalCabangId = program.cabang_id;

    const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;
    const hashed = await bcrypt.hash(String(password), 10);

    const [userRes] = await conn.query(
      `INSERT INTO users (email, password, role, cabang_id, is_active) VALUES (?, ?, '${ROLES.SISWA}', ?, ?)`,
      [email, hashed, finalCabangId, activeFlag]
    );

    const userId = userRes.insertId;

    const [siswaRes] = await conn.query(
      `INSERT INTO siswa
        (user_id, cabang_id, nama, nik, telepon, alamat, tanggal_lahir, sekolah_asal, jenjang, kelas, foto, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        finalCabangId,
        nama,
        nik || null,
        telepon || null,
        alamat || null,
        tanggal_lahir || null,
        sekolah_asal || null,
        jenjang || null,
        kelas || null,
        foto || null,
        activeFlag,
      ]
    );

    // Sync mapel for siswa
    if (mapel_ids && Array.isArray(mapel_ids) && mapel_ids.length > 0) {
      await syncSiswaMapel(conn, siswaRes.insertId, mapel_ids);
    }

    const totalPertemuan = Number(program.jumlah_pertemuan || 0);
    if (!totalPertemuan) {
      throw new Error("Jumlah pertemuan program belum diatur.");
    }

    // Status awal 'menunggu_jadwal' - akan berubah ke 'aktif' setelah jadwal dibuat
    const [enrollRes] = await conn.query(
      `INSERT INTO enrollment
        (siswa_id, program_id, kelas_id, tanggal_daftar, total_pertemuan, sisa_pertemuan, status_enrollment)
       VALUES (?, ?, ?, ?, ?, ?, '${ENROLLMENT_STATUS.MENUNGGU_JADWAL}')`,
      [siswaRes.insertId, program.id, null, new Date(), totalPertemuan, totalPertemuan]
    );

    const enrollmentId = enrollRes.insertId;
    await tagihanService.createTagihanForEnrollment(conn, enrollmentId, finalCabangId);

    await autoHandleEnrollmentScheduling(conn, {
      enrollmentId,
      program,
      siswaId: siswaRes.insertId,
      cabangId: finalCabangId,
      preferredEdukatorId: edukator_id || null,
    });

    await conn.commit();
    return { id: siswaRes.insertId, user_id: userId, enrollment_id: enrollmentId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateSiswa = async (payload, existing) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      id,
      email,
      password,
      program_id,
      start_date,
      nama,
      nik,
      telepon,
      alamat,
      tanggal_lahir,
      sekolah_asal,
      jenjang,
      kelas,
      foto,
      is_active,
      mapel_ids, // Mapel selection
    } = payload;

    if (email) {
      const [dupeRows] = await conn.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [email, existing.user_id]
      );
      if (dupeRows.length) {
        throw new Error("Email sudah terdaftar.");
      }
      await conn.query("UPDATE users SET email = ? WHERE id = ?", [email, existing.user_id]);
    }

    if (password) {
      const hashed = await bcrypt.hash(String(password), 10);
      await conn.query("UPDATE users SET password = ? WHERE id = ?", [
        hashed,
        existing.user_id,
      ]);
    }

    if (typeof is_active !== "undefined") {
      await conn.query("UPDATE users SET is_active = ? WHERE id = ?", [
        is_active ? 1 : 0,
        existing.user_id,
      ]);
    }

    if (program_id) {
      const [programRows] = await conn.query(
        "SELECT id, cabang_id, tipe_les, jumlah_pertemuan, mapel_id FROM program WHERE id = ?",
        [program_id]
      );
      const program = programRows[0];
      if (!program) {
        throw new Error("Program tidak ditemukan.");
      }

      const totalPertemuan = Number(program.jumlah_pertemuan || 0);
      if (!totalPertemuan) {
        throw new Error("Jumlah pertemuan program belum diatur.");
      }

      const [enRows] = await conn.query(
        `SELECT id, program_id
         FROM enrollment
         WHERE siswa_id = ? AND status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [existing.id]
      );
      const enrollment = enRows[0];

      if (enrollment) {
        if (Number(enrollment.program_id) !== Number(program_id)) {
          await conn.query(
            `UPDATE enrollment
             SET program_id = ?, total_pertemuan = ?, sisa_pertemuan = ?, status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
             WHERE id = ?`,
            [program_id, totalPertemuan, totalPertemuan, enrollment.id]
          );
          await tagihanService.createTagihanForEnrollment(
            conn,
            enrollment.id,
            existing.cabang_id
          );
          await autoHandleEnrollmentScheduling(conn, {
            enrollmentId: enrollment.id,
            program,
            siswaId: existing.id,
            cabangId: existing.cabang_id,
            startDate: start_date || null,
          });
        }
      } else {
        const [enrollRes] = await conn.query(
          `INSERT INTO enrollment
            (siswa_id, program_id, kelas_id, tanggal_daftar, total_pertemuan, sisa_pertemuan, status_enrollment)
           VALUES (?, ?, ?, ?, ?, ?, '${ENROLLMENT_STATUS.AKTIF}')`,
          [existing.id, program_id, null, new Date(), totalPertemuan, totalPertemuan]
        );
        const enrollmentId = enrollRes.insertId;
        await tagihanService.createTagihanForEnrollment(
          conn,
          enrollmentId,
          existing.cabang_id
        );
        await autoHandleEnrollmentScheduling(conn, {
          enrollmentId,
          program,
          siswaId: existing.id,
          cabangId: existing.cabang_id,
          startDate: start_date || null,
        });
      }
    }

    await conn.query(
      `UPDATE siswa SET
        nama = ?, nik = ?, telepon = ?, alamat = ?, tanggal_lahir = ?,
        sekolah_asal = ?, jenjang = ?, kelas = ?, foto = ?, is_active = ?
       WHERE id = ?`,
      [
        nama || existing.nama,
        nik || existing.nik,
        telepon || existing.telepon,
        alamat || existing.alamat,
        tanggal_lahir || existing.tanggal_lahir,
        sekolah_asal || existing.sekolah_asal,
        jenjang || existing.jenjang,
        kelas || existing.kelas,
        typeof foto !== "undefined" ? foto : existing.foto,
        typeof is_active !== "undefined" ? (is_active ? 1 : 0) : existing.is_active,
        id,
      ]
    );

    // Sync mapel for siswa
    if (mapel_ids && Array.isArray(mapel_ids)) {
      await syncSiswaMapel(conn, existing.id, mapel_ids);
    }

    await conn.commit();
    return { id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const deleteSiswa = async (id, userId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM siswa WHERE id = ?", [id]);
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

const renewProgram = async ({ siswaId, programId, startDate, cabangId }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [siswaRows] = await conn.query(
      "SELECT id, cabang_id, nama FROM siswa WHERE id = ? LIMIT 1",
      [siswaId]
    );
    const siswa = siswaRows[0];
    if (!siswa) {
      throw new Error("Siswa tidak ditemukan.");
    }
    if (cabangId && siswa.cabang_id !== cabangId) {
      throw new Error("Cabang tidak sesuai.");
    }

    let selectedProgramId = programId;
    if (!selectedProgramId) {
      const [enRows] = await conn.query(
        `SELECT program_id
         FROM enrollment
         WHERE siswa_id = ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [siswaId]
      );
      selectedProgramId = enRows[0]?.program_id;
    }
    if (!selectedProgramId) {
      throw new Error("Program belum dipilih.");
    }

    const [programRows] = await conn.query(
      "SELECT id, cabang_id, tipe_les, jumlah_pertemuan, nama FROM program WHERE id = ?",
      [selectedProgramId]
    );
    const program = programRows[0];
    if (!program) {
      throw new Error("Program tidak ditemukan.");
    }
    if (cabangId && program.cabang_id !== cabangId) {
      throw new Error("Program bukan dari cabang ini.");
    }

    const totalPertemuan = Number(program.jumlah_pertemuan || 0);
    if (!totalPertemuan) {
      throw new Error("Jumlah pertemuan program belum diatur.");
    }

    const baseDate = startDate ? new Date(`${startDate}T00:00:00`) : new Date();
    if (Number.isNaN(baseDate.getTime())) {
      throw new Error("Tanggal mulai tidak valid.");
    }

    // VALIDATION: Check if there's an existing active enrollment with incomplete jadwal
    const [activeEnrollRows] = await conn.query(
      `SELECT e.id, e.total_pertemuan,
              (SELECT COUNT(DISTINCT p.id)
               FROM jadwal j
               LEFT JOIN presensi p ON p.jadwal_id = j.id
               WHERE j.enrollment_id = e.id AND p.id IS NOT NULL
              ) as completed_count
       FROM enrollment e
       WHERE e.siswa_id = ? AND e.program_id = ? AND e.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
       ORDER BY e.created_at DESC
       LIMIT 1`,
      [siswaId, selectedProgramId]
    );

    if (activeEnrollRows.length > 0) {
      const activeEnroll = activeEnrollRows[0];
      const enrollTotalPertemuan = Number(activeEnroll.total_pertemuan || 0);
      const completedCount = Number(activeEnroll.completed_count || 0);

      // Check if jadwal exists for this enrollment
      const [jadwalCount] = await conn.query(
        `SELECT COUNT(*) as cnt FROM jadwal WHERE enrollment_id = ?`,
        [activeEnroll.id]
      );
      const hasJadwal = Number(jadwalCount[0]?.cnt || 0) > 0;

      // If there's jadwal but not all completed, prevent renewal
      if (hasJadwal && completedCount < enrollTotalPertemuan) {
        throw new Error(
          `Tidak dapat memperpanjang program. Jadwal masih aktif dengan ${completedCount}/${enrollTotalPertemuan} pertemuan selesai. ` +
          `Selesaikan semua jadwal terlebih dahulu sebelum memperpanjang.`
        );
      }
    }

    // Mark old enrollment as completed
    await conn.query(
      `UPDATE enrollment
       SET status_enrollment = '${ENROLLMENT_STATUS.SELESAI}', sisa_pertemuan = 0
       WHERE siswa_id = ? AND program_id = ? AND status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'`,
      [siswaId, selectedProgramId]
    );

    // Create new enrollment
    const [enrollRes] = await conn.query(
      `INSERT INTO enrollment
        (siswa_id, program_id, kelas_id, tanggal_daftar, total_pertemuan, sisa_pertemuan, status_enrollment)
       VALUES (?, ?, ?, ?, ?, ?, '${ENROLLMENT_STATUS.AKTIF}')`,
      [siswaId, selectedProgramId, null, baseDate, totalPertemuan, totalPertemuan]
    );
    const newEnrollmentId = enrollRes.insertId;

    // Create new tagihan
    await tagihanService.createTagihanForEnrollment(
      conn,
      newEnrollmentId,
      cabangId || siswa.cabang_id
    );

    // Track what was created for response
    const result = {
      enrollment_id: newEnrollmentId,
      siswa_nama: siswa.nama,
      program_nama: program.nama,
      total_pertemuan: totalPertemuan,
      tanggal_mulai: baseDate.toISOString().slice(0, 10),
      tagihan_created: true,
      jadwal_created: false,
      jadwal_count: 0,
      message: ""
    };

    // Return result - jadwal akan dibuat manual oleh admin melalui menu Jadwal
    // Ini memberikan kontrol penuh kepada admin untuk mengatur jadwal
    result.message = "Perpanjangan berhasil! Enrollment dan tagihan baru telah dibuat. Jadwal akan dibuat oleh admin melalui menu Jadwal.";
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  listSiswa,
  getSiswaById,
  getProfileByUserId,
  listProgramsByUserId,
  getTagihanSummaryByUserId,
  getRecommendedProgramsByUserId,
  renewProgramByUserId,
  updateProfileByUserId,
  createSiswa,
  updateSiswa,
  deleteSiswa,
  renewProgram,
};
