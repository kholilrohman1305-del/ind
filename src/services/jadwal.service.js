const db = require("../db");

const getSiswaIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM siswa WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
};

const getEdukatorIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM edukator WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
};

const listPrivatJadwal = async ({ cabangId, siswaId, edukatorId }) => {
  const params = [];
  let where = "WHERE j.tipe_les = 'privat'";

  if (cabangId) {
    where += " AND j.cabang_id = ?";
    params.push(cabangId);
  }
  if (siswaId) {
    where += " AND en.siswa_id = ?";
    params.push(siswaId);
  }
  if (edukatorId) {
    where += " AND j.edukator_id = ?";
    params.push(edukatorId);
  }

  const [rows] = await db.query(
    `SELECT j.id, j.cabang_id, j.enrollment_id, j.program_id, j.edukator_id, j.mapel_id,
            j.tipe_les, j.tanggal, j.jam_mulai, j.jam_selesai, j.status_jadwal, j.created_at,
            s.nama AS siswa_nama, p.nama AS program_nama, e.nama AS edukator_nama,
            m.nama AS mapel_nama, p.jumlah_pertemuan,
            ROW_NUMBER() OVER (PARTITION BY j.enrollment_id ORDER BY j.tanggal, j.jam_mulai, j.id) AS pertemuan_ke,
            (SELECT COUNT(*) FROM jadwal j2 WHERE j2.enrollment_id = en.id) AS total_jadwal
     FROM jadwal j
     LEFT JOIN enrollment en ON en.id = j.enrollment_id
     LEFT JOIN siswa s ON s.id = en.siswa_id
     LEFT JOIN program p ON p.id = j.program_id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     ${where}
     ORDER BY j.tanggal DESC, j.jam_mulai ASC`,
    params
  );
  return rows;
};

const listPrivatSummary = async (cabangId) => {
  const params = [];
  let where = "WHERE p.tipe_les = 'privat'";
  if (cabangId) {
    where += " AND s.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT en.id AS enrollment_id, s.id AS siswa_id, s.nama AS siswa_nama,
            p.id AS program_id, p.nama AS program_nama, p.jumlah_pertemuan,
            COUNT(j.id) AS total_jadwal,
            SUM(CASE WHEN j.status_jadwal = 'completed' THEN 1 ELSE 0 END) AS completed_jadwal
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     LEFT JOIN jadwal j ON j.enrollment_id = en.id
     ${where}
     GROUP BY en.id
     HAVING COUNT(j.id) > 0
     ORDER BY s.nama ASC`,
    params
  );
  return rows;
};

const listPrivatSlots = async (enrollmentId, cabangId) => {
  const params = [enrollmentId];
  let where = "WHERE en.id = ?";
  if (cabangId) {
    where += " AND s.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT j.id, j.enrollment_id, j.program_id, j.edukator_id, j.mapel_id,
            j.tanggal, j.jam_mulai, j.jam_selesai, j.status_jadwal,
            s.nama AS siswa_nama, p.nama AS program_nama, e.nama AS edukator_nama,
            m.nama AS mapel_nama, p.jumlah_pertemuan, pr.catatan AS materi
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     LEFT JOIN jadwal j ON j.enrollment_id = en.id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     LEFT JOIN presensi pr ON pr.jadwal_id = j.id
     ${where}
     ORDER BY j.tanggal ASC, j.jam_mulai ASC`,
    params
  );
  return rows;
};


const listKelasGroups = async (cabangId) => {
  const params = [];
  let where = "WHERE 1=1";
  if (cabangId) {
    where += " AND k.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT k.id, k.nama,
            GROUP_CONCAT(DISTINCT p.id ORDER BY p.nama SEPARATOR ',') AS program_ids,
            GROUP_CONCAT(DISTINCT p.nama ORDER BY p.nama SEPARATOR ', ') AS program_names
     FROM kelas k
     LEFT JOIN kelas_program kp ON kp.kelas_id = k.id
     LEFT JOIN program p ON p.id = kp.program_id
     ${where}
     GROUP BY k.id
     ORDER BY k.nama ASC`,
    params
  );

  return rows.map((row) => ({
    id: row.id,
    nama: row.nama,
    program_ids: row.program_ids ? row.program_ids.split(",").map(Number) : [],
    program_names: row.program_names || "",
  }));
};

const listKelasSiswaByPrograms = async (programIds, cabangId) => {
  if (!programIds || !programIds.length) return [];
  const params = [programIds];
  let where = "WHERE en.program_id IN (?) AND en.status_enrollment = 'aktif'";
  if (cabangId) {
    where += " AND s.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT en.id AS enrollment_id, s.id AS siswa_id, s.nama AS siswa_nama, s.kelas,
            p.id AS program_id, p.nama AS program_nama, p.jumlah_pertemuan
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     ${where}
     ORDER BY s.nama ASC`,
    params
  );
  return rows;
};

const getKelasPrograms = async (kelasId, connection = db) => {
  const [rows] = await connection.query(
    `SELECT p.id, p.nama, p.jumlah_pertemuan, p.cabang_id, p.tipe_les
     FROM kelas_program kp
     JOIN program p ON p.id = kp.program_id
     WHERE kp.kelas_id = ?`,
    [kelasId]
  );
  return rows;
};

const createKelasGroup = async (conn, cabangId, nama, programIds) => {
  if (!nama) {
    throw new Error("Nama kelas wajib diisi.");
  }
  if (!Array.isArray(programIds) || programIds.length === 0) {
    throw new Error("Program kelas wajib dipilih.");
  }

  const [insert] = await conn.query(
    `INSERT INTO kelas (cabang_id, program_id, edukator_id, nama, hari, jam_mulai, jam_selesai, kapasitas, is_active)
     VALUES (?, ?, NULL, ?, NULL, NULL, NULL, 20, 1)`,
    [cabangId, programIds[0], nama]
  );
  const kelasId = insert.insertId;

  const values = programIds.map((id) => [kelasId, id]);
  await conn.query(
    `INSERT INTO kelas_program (kelas_id, program_id) VALUES ?`,
    [values]
  );

  return kelasId;
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

const listKelasSummary = async (cabangId) => {
  const params = [];
  let where = "WHERE 1=1";
  if (cabangId) {
    where += " AND k.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT k.id AS kelas_id, k.nama AS kelas_nama,
            GROUP_CONCAT(DISTINCT p.nama ORDER BY p.nama SEPARATOR ', ') AS program_list,
            COUNT(j.id) AS total_jadwal
     FROM kelas k
     LEFT JOIN kelas_program kp ON kp.kelas_id = k.id
     LEFT JOIN program p ON p.id = kp.program_id
     LEFT JOIN jadwal j ON j.kelas_id = k.id AND j.tipe_les = 'kelas'
     ${where}
     GROUP BY k.id
     HAVING COUNT(j.id) > 0
     ORDER BY k.nama ASC`,
    params
  );
  return rows;
};

const listKelasSlots = async (kelasId, cabangId) => {
  const params = [kelasId];
  let where = "WHERE j.kelas_id = ? AND j.tipe_les = 'kelas'";
  if (cabangId) {
    where += " AND k.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT j.id, j.kelas_id, j.edukator_id, j.mapel_id, j.tanggal, j.jam_mulai, j.jam_selesai,
            j.status_jadwal, k.nama AS kelas_nama, e.nama AS edukator_nama, m.nama AS mapel_nama,
            pr.catatan AS materi
     FROM jadwal j
     JOIN kelas k ON k.id = j.kelas_id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     LEFT JOIN presensi pr ON pr.jadwal_id = j.id
     ${where}
     ORDER BY j.tanggal ASC, j.jam_mulai ASC`,
    params
  );
  return rows;
};

const listKelasJadwal = async ({ cabangId, siswaId, edukatorId }) => {
  const params = [];
  let where = "WHERE j.tipe_les = 'kelas'";

  if (cabangId) {
    where += " AND j.cabang_id = ?";
    params.push(cabangId);
  }
  if (edukatorId) {
    where += " AND j.edukator_id = ?";
    params.push(edukatorId);
  }

  let siswaJoin = "";
  let siswaSelect = "";
  if (siswaId) {
    siswaJoin = `
      JOIN jadwal_kelas_siswa jks ON jks.jadwal_id = j.id
      JOIN enrollment en ON en.id = jks.enrollment_id AND en.siswa_id = ?
      JOIN program pr ON pr.id = en.program_id
    `;
    siswaSelect = ", pr.nama AS program_nama, jks.pertemuan_ke, jks.status AS status_pertemuan";
    params.push(siswaId);
  }

  const [rows] = await db.query(
    `SELECT j.id, j.cabang_id, j.kelas_id, j.edukator_id, j.mapel_id, j.tipe_les,
            j.tanggal, j.jam_mulai, j.jam_selesai, j.status_jadwal, j.created_at,
            k.nama AS kelas_nama, e.nama AS edukator_nama, m.nama AS mapel_nama
            ${siswaSelect}
     FROM jadwal j
     JOIN kelas k ON k.id = j.kelas_id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     ${siswaJoin}
     ${where}
     ORDER BY j.tanggal DESC, j.jam_mulai ASC`,
    params
  );
  return rows;
};

const listJadwal = async ({ tipe, role, cabangId, userId }) => {
  let siswaId = null;
  let edukatorId = null;

  if (role === "siswa") {
    siswaId = await getSiswaIdByUserId(userId);
    if (!siswaId) return [];
  }

  if (role === "edukator") {
    edukatorId = await getEdukatorIdByUserId(userId);
    if (!edukatorId) return [];
  }

  if (tipe === "kelas") {
    return listKelasJadwal({ cabangId, siswaId, edukatorId });
  }
  return listPrivatJadwal({ cabangId, siswaId, edukatorId });
};

const listPrivatSiswa = async (cabangId) => {
  const params = [];
  let where = "WHERE en.status_enrollment = 'aktif' AND p.tipe_les = 'privat'";
  if (cabangId) {
    where += " AND s.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT en.id AS enrollment_id, s.id AS siswa_id, s.nama AS siswa_nama,
            s.kelas, p.id AS program_id, p.nama AS program_nama, p.jumlah_pertemuan
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     ${where}
     ORDER BY s.nama ASC`,
    params
  );
  return rows;
};

const listKelasSiswa = async (kelasId, cabangId) => {
  const params = [kelasId];
  let where = "WHERE kp.kelas_id = ? AND en.status_enrollment = 'aktif'";
  if (cabangId) {
    where += " AND s.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT en.id AS enrollment_id, s.id AS siswa_id, s.nama AS siswa_nama, s.kelas,
            p.id AS program_id, p.nama AS program_nama, p.jumlah_pertemuan
     FROM kelas_program kp
     JOIN enrollment en ON en.program_id = kp.program_id
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     ${where}
     ORDER BY s.nama ASC`,
    params
  );
  return rows;
};

const createPrivatJadwal = async ({ enrollment_id, slots }, cabangId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [enrollRows] = await conn.query(
      `SELECT en.id, en.program_id, p.tipe_les, p.jumlah_pertemuan, s.cabang_id, s.id AS siswa_id
       FROM enrollment en
       JOIN program p ON p.id = en.program_id
       JOIN siswa s ON s.id = en.siswa_id
       WHERE en.id = ?`,
      [enrollment_id]
    );
    const enrollment = enrollRows[0];
    if (!enrollment) {
      throw new Error("Enrollment tidak ditemukan.");
    }
    if (enrollment.tipe_les !== "privat") {
      throw new Error("Enrollment bukan program privat.");
    }
    if (cabangId && enrollment.cabang_id !== cabangId) {
      throw new Error("Cabang tidak sesuai.");
    }

    if (!Array.isArray(slots)) {
      throw new Error("Slot jadwal wajib diisi.");
    }

    const totalPertemuan = enrollment.jumlah_pertemuan || 0;
    const filledSlots = slots.filter((slot) => slot.edukator_id && slot.mapel_id);

    if (totalPertemuan > 0) {
      const [countRows] = await conn.query(
        "SELECT COUNT(*) AS total FROM jadwal WHERE enrollment_id = ?",
        [enrollment_id]
      );
      const existingTotal = Number(countRows[0]?.total || 0);
      if (existingTotal + filledSlots.length > totalPertemuan) {
        throw new Error("Jumlah slot terisi melebihi jumlah pertemuan.");
      }
    }

    if (filledSlots.length === 0) {
      await conn.commit();
      return { inserted: 0 };
    }

    for (const slot of filledSlots) {
      if (
        (slot.jam_mulai && !slot.jam_selesai) ||
        (!slot.jam_mulai && slot.jam_selesai)
      ) {
        throw new Error("Jam mulai dan selesai harus diisi bersama.");
      }
      if (slot.jam_mulai && slot.jam_selesai && !isValidTimeRange(slot.jam_mulai, slot.jam_selesai)) {
        throw new Error("Jam mulai harus sebelum jam selesai.");
      }
      if (slot.tanggal && slot.jam_mulai && slot.jam_selesai) {
        const conflict = await hasConflict({
          tanggal: slot.tanggal,
          jam_mulai: slot.jam_mulai,
          jam_selesai: slot.jam_selesai,
          edukator_id: slot.edukator_id,
          siswa_id: enrollment.siswa_id,
        });
        if (conflict) {
          throw new Error(`Bentrok jadwal pada ${slot.tanggal}.`);
        }
      }
    }

    const values = filledSlots.map((slot) => {
      return [
        enrollment.cabang_id,
        enrollment_id,
        enrollment.program_id,
        Number(slot.edukator_id),
        Number(slot.mapel_id),
        "privat",
        slot.tanggal || null,
        slot.jam_mulai || null,
        slot.jam_selesai || null,
        "scheduled",
      ];
    });

    await conn.query(
      `INSERT INTO jadwal
        (cabang_id, enrollment_id, program_id, edukator_id, mapel_id, tipe_les,
         tanggal, jam_mulai, jam_selesai, status_jadwal)
       VALUES ?`,
      [values]
    );

    await conn.commit();
    return { inserted: values.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const dayMap = {
  minggu: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  sabtu: 6,
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};

const isValidTimeRange = (startTime, endTime) => {
  if (!startTime || !endTime) return false;
  return String(startTime) < String(endTime);
};

const hasConflict = async ({
  jadwalId,
  tanggal,
  jam_mulai,
  jam_selesai,
  edukator_id,
  siswa_id,
}) => {
  const params = [tanggal, jam_selesai, jam_mulai];
  let where = "WHERE tanggal = ? AND jam_mulai < ? AND jam_selesai > ?";

  if (jadwalId) {
    where += " AND id != ?";
    params.push(jadwalId);
  }

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

  const [rows] = await db.query(`SELECT id FROM jadwal ${where} LIMIT 1`, params);
  return rows.length > 0;
};

const buildKelasSchedule = (startDate, endDate, slots) => {
  const entries = [];
  slots.forEach((slot) => {
    const dayIndex = dayMap[String(slot.hari || "").toLowerCase()];
    if (typeof dayIndex !== "number") {
      throw new Error("Hari jadwal tidak valid.");
    }
    const startDay = startDate.getDay();
    const delta = (dayIndex - startDay + 7) % 7;
    let current = addDays(startDate, delta);
    while (current <= endDate) {
      entries.push({ ...slot, tanggal: formatDate(current) });
      current = addDays(current, 7);
    }
  });

  entries.sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  return entries;
};

const createKelasJadwal = async (
  { kelas_id, kelas_nama, program_ids, edukator_id, tanggal_mulai, tanggal_akhir, slots },
  cabangId
) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    let kelasId = kelas_id ? Number(kelas_id) : null;
    if (!kelasId) {
      if (!kelas_nama) {
        throw new Error("Nama kelas wajib diisi.");
      }
      if (!Array.isArray(program_ids) || program_ids.length === 0) {
        throw new Error("Program kelas wajib dipilih.");
      }

      const [programRows] = await conn.query(
        "SELECT id, cabang_id, tipe_les FROM program WHERE id IN (?)",
        [program_ids]
      );
      if (programRows.length !== program_ids.length) {
        throw new Error("Program kelas tidak valid.");
      }
      if (programRows.some((row) => row.tipe_les !== "kelas")) {
        throw new Error("Program harus tipe kelas.");
      }
      if (cabangId && programRows.some((row) => row.cabang_id !== cabangId)) {
        throw new Error("Program bukan dari cabang ini.");
      }

      kelasId = await createKelasGroup(conn, cabangId || programRows[0].cabang_id, kelas_nama, program_ids);
    }

    const programs = await getKelasPrograms(kelasId, conn);
    if (!programs.length) {
      throw new Error("Program kelas belum diatur.");
    }
    if (programs.some((row) => row.tipe_les !== "kelas")) {
      throw new Error("Program harus tipe kelas.");
    }
    if (cabangId && programs.some((row) => row.cabang_id !== cabangId)) {
      throw new Error("Cabang tidak sesuai.");
    }

    if (!edukator_id) {
      throw new Error("Edukator wajib dipilih.");
    }
    if (!tanggal_mulai) {
      throw new Error("Tanggal mulai wajib diisi.");
    }
    if (!tanggal_akhir) {
      throw new Error("Tanggal berakhir wajib diisi.");
    }
    if (!Array.isArray(slots) || slots.length === 0) {
      throw new Error("Slot hari wajib diisi.");
    }

    const startDate = new Date(`${tanggal_mulai}T00:00:00`);
    if (Number.isNaN(startDate.getTime())) {
      throw new Error("Tanggal mulai tidak valid.");
    }
    const endDate = new Date(`${tanggal_akhir}T23:59:59`);
    if (Number.isNaN(endDate.getTime())) {
      throw new Error("Tanggal berakhir tidak valid.");
    }
    if (endDate < startDate) {
      throw new Error("Tanggal berakhir harus setelah tanggal mulai.");
    }

    const scheduleEntries = buildKelasSchedule(startDate, endDate, slots);
    if (scheduleEntries.length === 0) {
      throw new Error("Slot jadwal belum lengkap.");
    }

    for (const slot of scheduleEntries) {
      if (!slot.mapel_id) {
        throw new Error("Data slot belum lengkap.");
      }
      if ((slot.jam_mulai && !slot.jam_selesai) || (!slot.jam_mulai && slot.jam_selesai)) {
        throw new Error("Jam mulai dan selesai harus diisi bersama.");
      }
      if (slot.jam_mulai && slot.jam_selesai && !isValidTimeRange(slot.jam_mulai, slot.jam_selesai)) {
        throw new Error("Jam mulai harus sebelum jam selesai.");
      }
    }

    for (const slot of scheduleEntries) {
      if (slot.jam_mulai && slot.jam_selesai) {
        const conflict = await hasConflict({
          tanggal: slot.tanggal,
          jam_mulai: slot.jam_mulai,
          jam_selesai: slot.jam_selesai,
          edukator_id,
        });
        if (conflict) {
          throw new Error(`Bentrok jadwal edukator pada ${slot.tanggal}.`);
        }
      }
    }

    const primaryProgramId = programs[0].id;
    const values = scheduleEntries.map((slot) => [
      programs[0].cabang_id,
      null,
      primaryProgramId,
      Number(edukator_id),
      Number(slot.mapel_id),
      "kelas",
      slot.tanggal,
      slot.jam_mulai || null,
      slot.jam_selesai || null,
      "scheduled",
      kelasId,
    ]);

    await conn.query(
      `INSERT INTO jadwal
        (cabang_id, enrollment_id, program_id, edukator_id, mapel_id, tipe_les,
         tanggal, jam_mulai, jam_selesai, status_jadwal, kelas_id)
       VALUES ?`,
      [values]
    );

    const [jadwalRows] = await conn.query(
      `SELECT id, tanggal, jam_mulai, jam_selesai
       FROM jadwal
       WHERE kelas_id = ? AND tipe_les = 'kelas'
         AND tanggal >= ? AND tanggal <= ?
       ORDER BY tanggal ASC, jam_mulai ASC, id ASC`,
      [kelasId, tanggal_mulai, tanggal_akhir]
    );

    const scheduleByDay = jadwalRows.map((row) => ({
      ...row,
      dayIndex: new Date(`${row.tanggal}T00:00:00`).getDay(),
    }));

    const [enrollments] = await conn.query(
      `SELECT en.id AS enrollment_id, en.program_id, p.jumlah_pertemuan
       FROM enrollment en
       JOIN program p ON p.id = en.program_id
       WHERE en.status_enrollment = 'aktif'
         AND en.program_id IN (?)`,
      [programs.map((p) => p.id)]
    );

    const allocationValues = [];
    const pertemuanCounter = {};

    enrollments.forEach((enrollment) => {
      const patternDays = getFixedPattern(Number(enrollment.jumlah_pertemuan || 1));
      const scheduleForStudent = scheduleByDay.filter((row) => patternDays.includes(row.dayIndex));
      pertemuanCounter[enrollment.enrollment_id] = 0;

      scheduleForStudent.forEach((row) => {
        pertemuanCounter[enrollment.enrollment_id] += 1;
        allocationValues.push([
          row.id,
          enrollment.enrollment_id,
          pertemuanCounter[enrollment.enrollment_id],
          "belum",
        ]);
      });
    });

    if (allocationValues.length) {
      await conn.query(
        `INSERT INTO jadwal_kelas_siswa (jadwal_id, enrollment_id, pertemuan_ke, status)
         VALUES ?`,
        [allocationValues]
      );
    }

    await conn.commit();
    return { inserted: values.length };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateJadwal = async (id, payload, cabangId) => {
  const [rows] = await db.query(
    `SELECT j.id, j.cabang_id, j.enrollment_id, j.tipe_les, en.siswa_id
     FROM jadwal j
     LEFT JOIN enrollment en ON en.id = j.enrollment_id
     WHERE j.id = ?`,
    [id]
  );
  const existing = rows[0];
  if (!existing) {
    throw new Error("Jadwal tidak ditemukan.");
  }
  if (cabangId && existing.cabang_id !== cabangId) {
    throw new Error("Cabang tidak sesuai.");
  }

  const tanggal = payload.tanggal;
  const jamMulai = payload.jam_mulai;
  const jamSelesai = payload.jam_selesai;
  const edukatorId = payload.edukator_id;
  const mapelId = payload.mapel_id;

  if (!edukatorId || !mapelId) {
    throw new Error("Data jadwal belum lengkap.");
  }
  if ((jamMulai && !jamSelesai) || (!jamMulai && jamSelesai)) {
    throw new Error("Jam mulai dan selesai harus diisi bersama.");
  }
  if (jamMulai && jamSelesai && !isValidTimeRange(jamMulai, jamSelesai)) {
    throw new Error("Jam mulai harus sebelum jam selesai.");
  }

  if (tanggal && jamMulai && jamSelesai) {
    const conflict = await hasConflict({
      jadwalId: id,
      tanggal,
      jam_mulai: jamMulai,
      jam_selesai: jamSelesai,
      edukator_id: edukatorId,
      siswa_id: existing.siswa_id || null,
    });
    if (conflict) {
      throw new Error("Bentrok jadwal edukator atau siswa.");
    }
  }

  await db.query(
    `UPDATE jadwal
     SET edukator_id = ?, mapel_id = ?, tanggal = ?, jam_mulai = ?, jam_selesai = ?
     WHERE id = ?`,
    [
      Number(edukatorId),
      Number(mapelId),
      tanggal || null,
      jamMulai || null,
      jamSelesai || null,
      id,
    ]
  );
  return { id };
};

const deletePrivatByEnrollment = async (enrollmentId, cabangId) => {
  const [rows] = await db.query(
    `SELECT en.id, s.cabang_id
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     WHERE en.id = ?`,
    [enrollmentId]
  );
  const enrollment = rows[0];
  if (!enrollment) {
    throw new Error("Enrollment tidak ditemukan.");
  }
  if (cabangId && enrollment.cabang_id !== cabangId) {
    throw new Error("Cabang tidak sesuai.");
  }
  await db.query("DELETE FROM jadwal WHERE enrollment_id = ?", [enrollmentId]);
};

const deleteKelasByKelas = async (kelasId, cabangId) => {
  const [rows] = await db.query("SELECT id, cabang_id, nama FROM kelas WHERE id = ?", [kelasId]);
  const kelas = rows[0];
  if (!kelas) {
    throw new Error("Kelas tidak ditemukan.");
  }
  if (cabangId && kelas.cabang_id !== cabangId) {
    throw new Error("Cabang tidak sesuai.");
  }
  await db.query("DELETE FROM jadwal WHERE kelas_id = ? AND tipe_les = 'kelas'", [kelasId]);
  return { id: kelasId };
};


module.exports = {
  listJadwal,
  listPrivatSiswa,
  listKelasSiswa,
  listKelasSiswaByPrograms,
  listKelasGroups,
  listPrivatSummary,
  listPrivatSlots,
  listKelasSummary,
  listKelasSlots,
  createPrivatJadwal,
  createKelasJadwal,
  updateJadwal,
  deletePrivatByEnrollment,
  deleteKelasByKelas,
};

