const db = require("../db");
const tagihanService = require("./tagihan.service");
const rekomendasiService = require("./rekomendasi.service");
const { ENROLLMENT_STATUS, JADWAL_STATUS, PENDAFTARAN_STATUS } = require("../config/constants");

// Helper: Format date to YYYY-MM-DD
const formatDate = (date) => {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Helper: Check if there's a conflict for edukator or siswa at given time
const hasConflict = async (conn, { tanggal, jam_mulai, jam_selesai, edukator_id, siswa_id }) => {
  const params = [tanggal, jam_selesai, jam_mulai];
  let where = "WHERE tanggal = ? AND jam_mulai < ? AND jam_selesai > ?";

  if (edukator_id && siswa_id) {
    where += " AND (edukator_id = ? OR enrollment_id IN (SELECT id FROM enrollment WHERE siswa_id = ?))";
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

// Helper: Resolve conflict by shifting to next week
const resolveConflictDate = async (conn, payload) => {
  if (!payload.tanggal) return null;
  const base = new Date(`${payload.tanggal}T00:00:00`);
  if (Number.isNaN(base.getTime())) return null;

  for (let i = 0; i < 12; i += 1) {
    const target = new Date(base);
    target.setDate(target.getDate() + i * 7);
    const targetDate = formatDate(target);
    const conflict = await hasConflict(conn, { ...payload, tanggal: targetDate });
    if (!conflict) return targetDate;
  }
  return null;
};

// Helper: Generate schedule dates based on preferred days
const generateScheduleDates = ({ startDate, preferredDays, totalPertemuan }) => {
  const dayMap = {
    minggu: 0, senin: 1, selasa: 2, rabu: 3,
    kamis: 4, jumat: 5, sabtu: 6
  };

  const targetDays = preferredDays.map((d) => dayMap[d.toLowerCase()]);
  const schedules = [];

  let currentDate = new Date(startDate);
  let count = 0;

  // Generate dates for next 4 months max
  const maxDate = new Date(startDate);
  maxDate.setMonth(maxDate.getMonth() + 4);

  while (count < totalPertemuan && currentDate <= maxDate) {
    if (targetDays.includes(currentDate.getDay())) {
      schedules.push({
        tanggal: formatDate(currentDate),
        pertemuan_ke: count + 1
      });
      count++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return schedules;
};

/**
 * Aktivasi siswa pending:
 * 1. Get siswa data with preferences
 * 2. For each mapel selected, find/create program and create enrollment
 * 3. Create tagihan for each enrollment
 * 4. Get recommended edukator using algorithm
 * 5. Create jadwal based on preferences
 * 6. Update siswa status to aktif
 */
const aktivasiSiswa = async (siswaId, cabangId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // 1. Get siswa data with mapel preferences
    const [siswaRows] = await conn.query(
      `SELECT s.*,
              GROUP_CONCAT(sm.mapel_id) as mapel_ids
       FROM siswa s
       LEFT JOIN siswa_mapel sm ON sm.siswa_id = s.id
       WHERE s.id = ? ${cabangId ? "AND s.cabang_id = ?" : ""}
       GROUP BY s.id`,
      cabangId ? [siswaId, cabangId] : [siswaId]
    );

    const siswa = siswaRows[0];
    if (!siswa) throw new Error("Siswa tidak ditemukan.");
    if (siswa.status_pendaftaran !== PENDAFTARAN_STATUS.PENDING) {
      throw new Error("Siswa sudah diaktivasi sebelumnya.");
    }

    // Parse preferences
    const mapelIds = siswa.mapel_ids ? siswa.mapel_ids.split(",").map(Number) : [];

    // Handle preferred_days - could be JSON string, already parsed array, or null
    let preferredDays = [];
    if (siswa.preferred_days) {
      if (Array.isArray(siswa.preferred_days)) {
        // Already parsed by MySQL driver
        preferredDays = siswa.preferred_days;
      } else if (typeof siswa.preferred_days === "string") {
        try {
          preferredDays = JSON.parse(siswa.preferred_days);
        } catch (e) {
          preferredDays = [];
        }
      }
    }

    const jamMulai = siswa.preferred_jam_mulai;
    const jamSelesai = siswa.preferred_jam_selesai;
    const tanggalMulai = siswa.tanggal_mulai_belajar || new Date();
    const siswaCabangId = siswa.cabang_id;

    // Debug log untuk troubleshooting
    console.log("Aktivasi Debug:", {
      siswaId,
      programId: siswa.program_id,
      mapelIds,
      preferredDays,
      rawPreferredDays: siswa.preferred_days,
      jamMulai,
      jamSelesai,
      tanggalMulai
    });

    // Validate: program wajib dipilih
    if (!siswa.program_id) {
      throw new Error("Siswa belum memilih program.");
    }
    if (!preferredDays || preferredDays.length === 0) {
      throw new Error("Siswa belum memilih hari belajar.");
    }

    // Track created schedules for response
    const jadwalCreated = [];
    const enrollmentsCreated = [];

    // 2. Ambil program yang dipilih siswa (1 program)
    const [selectedProgram] = await conn.query(
      `SELECT p.*, m.nama as mapel_nama
       FROM program p
       LEFT JOIN mapel m ON m.id = p.mapel_id
       WHERE p.id = ?`,
      [siswa.program_id]
    );
    const program = selectedProgram[0];
    if (!program) {
      throw new Error("Program tidak ditemukan.");
    }

    const mapelId = program.mapel_id || mapelIds[0] || null;
    const mapelNama = program.mapel_nama || program.nama || "-";
    if (!mapelId) {
      throw new Error("Program belum memiliki mapel untuk penjadwalan.");
    }

    // 3. Create enrollment (single)
    const totalPertemuan = program.jumlah_pertemuan || 8;
    const [enrollRes] = await conn.query(
      `INSERT INTO enrollment (siswa_id, program_id, tanggal_daftar, total_pertemuan, sisa_pertemuan, status_enrollment)
       VALUES (?, ?, ?, ?, ?, '${ENROLLMENT_STATUS.AKTIF}')`,
      [siswaId, program.id, tanggalMulai, totalPertemuan, totalPertemuan]
    );
    const enrollmentId = enrollRes.insertId;
    enrollmentsCreated.push({ enrollmentId, programId: program.id, mapel: mapelNama });

    // 4. Create tagihan (single)
    await tagihanService.createTagihanForEnrollment(conn, enrollmentId, siswaCabangId);

    // 5. Get recommended edukator (optional)
    let edukatorId = null;
    try {
      const recommendations = await rekomendasiService.getRecommendations({
        cabangId: siswaCabangId,
        mapelId,
        jenjang: siswa.jenjang
      });
      edukatorId = recommendations[0]?.id || null;
    } catch (e) {
      console.error("Recommendation error:", e.message);
    }

    if (!edukatorId) {
      const [fallbackEdukator] = await conn.query(
        `SELECT e.id FROM edukator e
         JOIN edukator_mapel em ON em.edukator_id = e.id
         WHERE e.cabang_utama_id = ? AND e.is_active = 1 AND em.mapel_id = ?
         LIMIT 1`,
        [siswaCabangId, mapelId]
      );
      edukatorId = fallbackEdukator[0]?.id || null;
    }

    // 6. Generate and create jadwal (tetap dibuat walau edukator belum ada)
    const scheduleDates = generateScheduleDates({
      startDate: tanggalMulai,
      preferredDays,
      totalPertemuan
    });

    for (const schedule of scheduleDates) {
      const resolvedDate = await resolveConflictDate(conn, {
        tanggal: schedule.tanggal,
        jam_mulai: jamMulai,
        jam_selesai: jamSelesai,
        edukator_id: edukatorId,
        siswa_id: siswaId
      });

      if (resolvedDate) {
        await conn.query(
          `INSERT INTO jadwal (cabang_id, enrollment_id, program_id, edukator_id, mapel_id, tipe_les, tanggal, jam_mulai, jam_selesai, status_jadwal)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '${JADWAL_STATUS.SCHEDULED}')`,
          [siswaCabangId, enrollmentId, program.id, edukatorId, mapelId, program.tipe_les || "privat", resolvedDate, jamMulai, jamSelesai]
        );
        jadwalCreated.push({
          mapel: mapelNama,
          tanggal: resolvedDate,
          jam: `${jamMulai} - ${jamSelesai}`,
          edukator_id: edukatorId
        });
      }
    }

    // 7. Update siswa status to aktif
    await conn.query(
      `UPDATE siswa SET status_pendaftaran = '${PENDAFTARAN_STATUS.AKTIF}', is_active = 1 WHERE id = ?`,
      [siswaId]
    );
    await conn.query(
      `UPDATE users SET is_active = 1 WHERE id = ?`,
      [siswa.user_id]
    );

    await conn.commit();

    return {
      success: true,
      message: `Siswa ${siswa.nama} berhasil diaktivasi`,
      enrollments_created: enrollmentsCreated.length,
      jadwal_created: jadwalCreated.length,
      details: jadwalCreated
    };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { aktivasiSiswa };
