const bcrypt = require("bcryptjs");
const db = require("../db");
const tagihanService = require("./tagihan.service");

const listSiswa = async (cabangId) => {
  if (cabangId) {
    const [rows] = await db.query(
      `SELECT s.id, s.user_id, s.cabang_id, s.nama, s.nik, s.telepon, s.alamat,
              s.tanggal_lahir, s.sekolah_asal, s.kelas, s.foto, s.is_active,
              s.created_at, u.email, en_active.program_id,
              p_active.nama AS program_nama,
              (SELECT GROUP_CONCAT(DISTINCT p2.nama ORDER BY p2.nama SEPARATOR ', ')
               FROM enrollment en2
               JOIN program p2 ON p2.id = en2.program_id
               WHERE en2.siswa_id = s.id AND en2.status_enrollment = 'aktif') AS program_list
       FROM siswa s
       LEFT JOIN users u ON u.id = s.user_id
       LEFT JOIN enrollment en_active
         ON en_active.id = (
           SELECT en3.id
           FROM enrollment en3
           WHERE en3.siswa_id = s.id AND en3.status_enrollment = 'aktif'
           ORDER BY en3.created_at DESC, en3.id DESC
           LIMIT 1
         )
       LEFT JOIN program p_active ON p_active.id = en_active.program_id
       WHERE s.cabang_id = ?
       ORDER BY s.created_at DESC`,
      [cabangId]
    );
    return rows;
  }

  const [rows] = await db.query(
    `SELECT s.id, s.user_id, s.cabang_id, s.nama, s.nik, s.telepon, s.alamat,
            s.tanggal_lahir, s.sekolah_asal, s.kelas, s.foto, s.is_active,
            s.created_at, u.email, en_active.program_id,
            p_active.nama AS program_nama,
            (SELECT GROUP_CONCAT(DISTINCT p2.nama ORDER BY p2.nama SEPARATOR ', ')
             FROM enrollment en2
             JOIN program p2 ON p2.id = en2.program_id
             WHERE en2.siswa_id = s.id AND en2.status_enrollment = 'aktif') AS program_list
     FROM siswa s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN enrollment en_active
       ON en_active.id = (
         SELECT en3.id
         FROM enrollment en3
         WHERE en3.siswa_id = s.id AND en3.status_enrollment = 'aktif'
         ORDER BY en3.created_at DESC, en3.id DESC
         LIMIT 1
       )
     LEFT JOIN program p_active ON p_active.id = en_active.program_id
     ORDER BY s.created_at DESC`
  );
  return rows;
};

const getSiswaById = async (id) => {
  const [rows] = await db.query(
    `SELECT s.id, s.user_id, s.cabang_id, s.nama, s.nik, s.telepon, s.alamat,
            s.tanggal_lahir, s.sekolah_asal, s.kelas, s.foto, s.is_active,
            s.created_at, u.email, en_active.program_id,
            p_active.nama AS program_nama,
            (SELECT GROUP_CONCAT(DISTINCT p2.nama ORDER BY p2.nama SEPARATOR ', ')
             FROM enrollment en2
             JOIN program p2 ON p2.id = en2.program_id
             WHERE en2.siswa_id = s.id AND en2.status_enrollment = 'aktif') AS program_list
     FROM siswa s
     LEFT JOIN users u ON u.id = s.user_id
     LEFT JOIN enrollment en_active
       ON en_active.id = (
         SELECT en3.id
         FROM enrollment en3
         WHERE en3.siswa_id = s.id AND en3.status_enrollment = 'aktif'
         ORDER BY en3.created_at DESC, en3.id DESC
         LIMIT 1
       )
     LEFT JOIN program p_active ON p_active.id = en_active.program_id
     WHERE s.id = ?`,
    [id]
  );
  return rows[0] || null;
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
  { enrollmentId, program, siswaId, cabangId, startDate }
) => {
  if (!program || program.tipe_les !== "privat") return 0;
  const totalPertemuan = Number(program.jumlah_pertemuan || 0);
  if (!totalPertemuan) return 0;

  const finalCabangId = cabangId || program.cabang_id;
  const [templateRows] = await conn.query(
    `SELECT j.tanggal, j.jam_mulai, j.jam_selesai, j.edukator_id, j.mapel_id
     FROM jadwal j
     JOIN enrollment en ON en.id = j.enrollment_id
     JOIN siswa s ON s.id = en.siswa_id
     WHERE j.tipe_les = 'privat'
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

    let edukatorId = source.edukator_id;
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
      "privat",
      resolvedDate,
      source.jam_mulai,
      source.jam_selesai,
      "scheduled",
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
  if (!program || program.tipe_les !== "kelas") return 0;
  const totalPertemuan = Number(program.jumlah_pertemuan || 1);

  const [kelasRows] = await conn.query(
    `SELECT k.id
     FROM kelas_program kp
     JOIN kelas k ON k.id = kp.kelas_id
     JOIN jadwal j ON j.kelas_id = k.id AND j.tipe_les = 'kelas'
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
     WHERE kelas_id = ? AND tipe_les = 'kelas' AND tanggal >= CURDATE()
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

const autoHandleEnrollmentScheduling = async (conn, { enrollmentId, program, siswaId, cabangId, startDate }) => {
  if (!program || !enrollmentId) return;
  if (program.tipe_les === "privat") {
    await autoCreatePrivatSchedule(conn, {
      enrollmentId,
      program,
      siswaId,
      cabangId,
      startDate,
    });
  } else if (program.tipe_les === "kelas") {
    await attachEnrollmentToKelasSchedule(conn, { enrollmentId, program });
  }
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
      kelas,
      foto,
      is_active,
    } = payload;

    if (!email || !password || !nama) {
      throw new Error("Email, password, dan nama wajib diisi.");
    }
    if (!program_id) {
      throw new Error("Program wajib dipilih.");
    }

    const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;
    const hashed = await bcrypt.hash(String(password), 10);

    const [userRes] = await conn.query(
      "INSERT INTO users (email, password, role, cabang_id, is_active) VALUES (?, ?, 'siswa', ?, ?)",
      [email, hashed, cabang_id, activeFlag]
    );

    const userId = userRes.insertId;

    const [siswaRes] = await conn.query(
      `INSERT INTO siswa
        (user_id, cabang_id, nama, nik, telepon, alamat, tanggal_lahir, sekolah_asal, kelas, foto, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        cabang_id,
        nama,
        nik || null,
        telepon || null,
        alamat || null,
        tanggal_lahir || null,
        sekolah_asal || null,
        kelas || null,
        foto || null,
        activeFlag,
      ]
    );

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

    const [enrollRes] = await conn.query(
      `INSERT INTO enrollment
        (siswa_id, program_id, kelas_id, tanggal_daftar, total_pertemuan, sisa_pertemuan, status_enrollment)
       VALUES (?, ?, ?, ?, ?, ?, 'aktif')`,
      [siswaRes.insertId, program.id, null, new Date(), totalPertemuan, totalPertemuan]
    );

    const enrollmentId = enrollRes.insertId;
    await tagihanService.createTagihanForEnrollment(conn, enrollmentId, cabang_id);

    await autoHandleEnrollmentScheduling(conn, {
      enrollmentId,
      program,
      siswaId: siswaRes.insertId,
      cabangId: cabang_id,
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
      kelas,
      foto,
      is_active,
    } = payload;

    if (email) {
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
         WHERE siswa_id = ? AND status_enrollment = 'aktif'
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [existing.id]
      );
      const enrollment = enRows[0];

      if (enrollment) {
        if (Number(enrollment.program_id) !== Number(program_id)) {
          await conn.query(
            `UPDATE enrollment
             SET program_id = ?, total_pertemuan = ?, sisa_pertemuan = ?, status_enrollment = 'aktif'
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
           VALUES (?, ?, ?, ?, ?, ?, 'aktif')`,
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
        sekolah_asal = ?, kelas = ?, foto = ?, is_active = ?
       WHERE id = ?`,
      [
        nama || existing.nama,
        nik || existing.nik,
        telepon || existing.telepon,
        alamat || existing.alamat,
        tanggal_lahir || existing.tanggal_lahir,
        sekolah_asal || existing.sekolah_asal,
        kelas || existing.kelas,
        typeof foto !== "undefined" ? foto : existing.foto,
        typeof is_active !== "undefined" ? (is_active ? 1 : 0) : existing.is_active,
        id,
      ]
    );

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
      "SELECT id, cabang_id FROM siswa WHERE id = ? LIMIT 1",
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
      "SELECT id, cabang_id, tipe_les, jumlah_pertemuan FROM program WHERE id = ?",
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

    await conn.query(
      `UPDATE enrollment
       SET status_enrollment = 'selesai', sisa_pertemuan = 0
       WHERE siswa_id = ? AND program_id = ? AND status_enrollment = 'aktif'`,
      [siswaId, selectedProgramId]
    );

    const [enrollRes] = await conn.query(
      `INSERT INTO enrollment
        (siswa_id, program_id, kelas_id, tanggal_daftar, total_pertemuan, sisa_pertemuan, status_enrollment)
       VALUES (?, ?, ?, ?, ?, ?, 'aktif')`,
      [siswaId, selectedProgramId, null, baseDate, totalPertemuan, totalPertemuan]
    );
    const newEnrollmentId = enrollRes.insertId;
    await tagihanService.createTagihanForEnrollment(
      conn,
      newEnrollmentId,
      cabangId || siswa.cabang_id
    );

    if (program.tipe_les === "privat") {
      const [oldEnrollRows] = await conn.query(
        `SELECT id
         FROM enrollment
         WHERE siswa_id = ? AND program_id = ? AND id <> ?
         ORDER BY created_at DESC, id DESC
         LIMIT 1`,
        [siswaId, selectedProgramId, newEnrollmentId]
      );
      const oldEnrollmentId = oldEnrollRows[0]?.id;
      if (!oldEnrollmentId) {
        throw new Error("Template jadwal privat belum tersedia.");
      }

      const [templateRows] = await conn.query(
        `SELECT tanggal, jam_mulai, jam_selesai, edukator_id, mapel_id
         FROM jadwal
         WHERE enrollment_id = ?
         ORDER BY tanggal ASC, jam_mulai ASC, id ASC`,
        [oldEnrollmentId]
      );
      if (!templateRows.length) {
        throw new Error("Template jadwal privat belum tersedia.");
      }

      const templateBase = templateRows.find((row) => row.tanggal)?.tanggal || null;
      const templateBaseDate = templateBase ? new Date(`${templateBase}T00:00:00`) : baseDate;
      const diffDays = Math.round((baseDate - templateBaseDate) / (24 * 60 * 60 * 1000));

      const values = [];
      let lastDate = null;
      for (let i = 0; i < totalPertemuan; i += 1) {
        const source = templateRows[i] || templateRows[templateRows.length - 1];
        let tanggal;
        if (source.tanggal) {
          const sourceDate = new Date(`${source.tanggal}T00:00:00`);
          const targetDate = new Date(sourceDate);
          targetDate.setDate(targetDate.getDate() + diffDays);
          tanggal = targetDate.toISOString().slice(0, 10);
          lastDate = new Date(targetDate);
        } else {
          const base = lastDate || baseDate;
          const nextDate = new Date(base);
          nextDate.setDate(nextDate.getDate() + (i === 0 ? 0 : 7));
          tanggal = nextDate.toISOString().slice(0, 10);
          lastDate = nextDate;
        }

        values.push([
          program.cabang_id,
          newEnrollmentId,
          selectedProgramId,
          source.edukator_id,
          source.mapel_id,
          "privat",
          tanggal,
          source.jam_mulai || null,
          source.jam_selesai || null,
          "scheduled",
          null,
        ]);
      }

      await conn.query(
        `INSERT INTO jadwal
          (cabang_id, enrollment_id, program_id, edukator_id, mapel_id, tipe_les,
           tanggal, jam_mulai, jam_selesai, status_jadwal, kelas_id)
         VALUES ?`,
        [values]
      );
    } else {
      const [kelasRows] = await conn.query(
        `SELECT k.id
         FROM kelas_program kp
         JOIN kelas k ON k.id = kp.kelas_id
         JOIN jadwal j ON j.kelas_id = k.id
         WHERE kp.program_id = ?
         GROUP BY k.id
         ORDER BY MAX(j.tanggal) DESC
         LIMIT 1`,
        [selectedProgramId]
      );
      const kelasId = kelasRows[0]?.id;
      if (!kelasId) {
        throw new Error("Kelas gabungan untuk program ini belum tersedia.");
      }

      const [jadwalRows] = await conn.query(
        `SELECT j.id, j.tanggal
         FROM jadwal j
         WHERE j.kelas_id = ? AND j.tipe_les = 'kelas' AND j.tanggal >= ?
         ORDER BY j.tanggal ASC, j.jam_mulai ASC, j.id ASC`,
        [kelasId, baseDate.toISOString().slice(0, 10)]
      );
      if (!jadwalRows.length) {
        throw new Error("Belum ada jadwal kelas mendatang.");
      }

      const dayMapping = {
        5: [1, 2, 3, 4, 5],
        4: [1, 2, 4, 5],
        3: [1, 3, 5],
        2: [2, 4],
        1: [1],
      };
      const patternDays = dayMapping[totalPertemuan] || dayMapping[1];
      const allocation = [];
      let pertemuanKe = 0;

      jadwalRows.forEach((row) => {
        if (pertemuanKe >= totalPertemuan) return;
        const dayIndex = new Date(`${row.tanggal}T00:00:00`).getDay();
        if (!patternDays.includes(dayIndex)) return;
        pertemuanKe += 1;
        allocation.push([row.id, newEnrollmentId, pertemuanKe, "belum"]);
      });

      if (!allocation.length) {
        throw new Error("Slot kelas belum mencukupi.");
      }
      await conn.query(
        `INSERT INTO jadwal_kelas_siswa (jadwal_id, enrollment_id, pertemuan_ke, status)
         VALUES ?`,
        [allocation]
      );
    }

    await conn.commit();
    return { enrollment_id: newEnrollmentId };
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
  createSiswa,
  updateSiswa,
  deleteSiswa,
  renewProgram,
};
