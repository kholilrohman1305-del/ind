const db = require("../db");
const penggajianService = require("./penggajian.service");
const { ENROLLMENT_STATUS, JADWAL_STATUS, PRESENSI_STATUS, TIPE_LES } = require("../config/constants");

const toStartOfDay = (value) => `${value} 00:00:00`;
const toEndOfDay = (value) => `${value} 23:59:59`;

const getEdukatorIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM edukator WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
};

const getSiswaIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM siswa WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
};

/**
 * Get list of students for a class schedule (kelas)
 */
const getKelasSiswaByJadwal = async (jadwalId, userId) => {
  // Verify the jadwal belongs to this edukator
  const [jadwalRows] = await db.query(
    `SELECT j.id, j.tipe_les, j.kelas_id, k.nama as kelas_nama
     FROM jadwal j
     LEFT JOIN kelas k ON k.id = j.kelas_id
     JOIN edukator e ON e.id = j.edukator_id
     WHERE j.id = ? AND e.user_id = ?`,
    [jadwalId, userId]
  );

  if (!jadwalRows.length) {
    throw new Error("Jadwal tidak ditemukan.");
  }

  const jadwal = jadwalRows[0];
  if (jadwal.tipe_les !== TIPE_LES.KELAS) {
    throw new Error("Jadwal ini bukan jadwal kelas.");
  }

  // Get students enrolled in this class schedule
  const [rows] = await db.query(
    `SELECT jks.id as jadwal_kelas_siswa_id,
            jks.enrollment_id,
            jks.status,
            s.id as siswa_id,
            s.nama as siswa_nama,
            s.kelas as siswa_kelas,
            p.nama as program_nama
     FROM jadwal_kelas_siswa jks
     JOIN enrollment e ON e.id = jks.enrollment_id
     JOIN siswa s ON s.id = e.siswa_id
     LEFT JOIN program p ON p.id = e.program_id
     WHERE jks.jadwal_id = ?
     ORDER BY s.nama ASC`,
    [jadwalId]
  );

  return {
    kelas_nama: jadwal.kelas_nama,
    siswa: rows
  };
};

const listSiswaHistory = async ({ userId }) => {
  const siswaId = await getSiswaIdByUserId(userId);
  if (!siswaId) return [];

  const [rows] = await db.query(
    `SELECT p.id AS presensi_id,
            j.tanggal, j.jam_mulai, j.jam_selesai,
            pr.nama AS program_nama, m.nama AS mapel_nama,
            e.nama AS edukator_nama, p.catatan AS materi,
            'privat' AS tipe_les
     FROM presensi_siswa ps
     JOIN presensi p ON p.id = ps.presensi_id
     JOIN jadwal j ON j.id = p.jadwal_id
     JOIN enrollment en ON en.id = ps.enrollment_id
     LEFT JOIN program pr ON pr.id = en.program_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     LEFT JOIN edukator e ON e.id = p.edukator_id
     WHERE ps.siswa_id = ?
     UNION ALL
     SELECT NULL AS presensi_id,
            j.tanggal, j.jam_mulai, j.jam_selesai,
            pr.nama AS program_nama, m.nama AS mapel_nama,
            e.nama AS edukator_nama, NULL AS materi,
            'kelas' AS tipe_les
     FROM jadwal_kelas_siswa jks
     JOIN jadwal j ON j.id = jks.jadwal_id
     JOIN enrollment en ON en.id = jks.enrollment_id
     LEFT JOIN program pr ON pr.id = en.program_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     WHERE en.siswa_id = ?
       AND jks.status IN ('hadir', 'selesai')
     ORDER BY tanggal DESC, jam_mulai DESC`,
    [siswaId, siswaId]
  );
  return rows;
};

const listSiswaHistoryByProgram = async ({ userId, programId }) => {
  const siswaId = await getSiswaIdByUserId(userId);
  if (!siswaId) return [];

  const [rows] = await db.query(
    `SELECT j.tanggal, j.jam_mulai, j.jam_selesai,
            m.nama AS mapel_nama,
            'privat' AS tipe_les
     FROM presensi_siswa ps
     JOIN presensi p ON p.id = ps.presensi_id
     JOIN jadwal j ON j.id = p.jadwal_id
     JOIN enrollment en ON en.id = ps.enrollment_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     WHERE ps.siswa_id = ?
       AND en.program_id = ?
     UNION ALL
     SELECT j.tanggal, j.jam_mulai, j.jam_selesai,
            m.nama AS mapel_nama,
            'kelas' AS tipe_les
     FROM jadwal_kelas_siswa jks
     JOIN jadwal j ON j.id = jks.jadwal_id
     JOIN enrollment en ON en.id = jks.enrollment_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     WHERE en.siswa_id = ?
       AND en.program_id = ?
       AND jks.status IN ('hadir', 'selesai')
     ORDER BY tanggal DESC, jam_mulai DESC`,
    [siswaId, programId, siswaId, programId]
  );
  return rows;
};

const listPresensiSummary = async ({ cabangId, search, year, month, edukatorId, startDate, endDate }, { limit, offset } = {}) => {
  const useRange = Boolean(startDate && endDate);
  const caseCondition = useRange ? "p.waktu_absen BETWEEN ? AND ?" : "YEAR(p.waktu_absen) = ? AND MONTH(p.waktu_absen) = ?";
  const jadwalCondition = useRange ? "j.tanggal BETWEEN ? AND ?" : "YEAR(j.tanggal) = ? AND MONTH(j.tanggal) = ?";
  const presensiCondition = useRange ? "p2.waktu_absen BETWEEN ? AND ?" : "YEAR(p2.waktu_absen) = ? AND MONTH(p2.waktu_absen) = ?";
  const initialParams = useRange
    ? [toStartOfDay(startDate), toEndOfDay(endDate), startDate, endDate, toStartOfDay(startDate), toEndOfDay(endDate)]
    : [year, month, year, month, year, month];

  // Build WHERE conditions for filtering
  let filterWhere = "";
  const filterParams = [];
  if (cabangId) {
    filterWhere += " AND e.cabang_utama_id = ?";
    filterParams.push(cabangId);
  }
  if (search) {
    filterWhere += " AND e.nama LIKE ?";
    filterParams.push(`%${search}%`);
  }
  if (edukatorId) {
    filterWhere += " AND e.id = ?";
    filterParams.push(edukatorId);
  }

  // Count query - uses same joins and conditions as data query
  const countInitialParams = useRange
    ? [startDate, endDate, toStartOfDay(startDate), toEndOfDay(endDate)]
    : [year, month, year, month];
  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM (
       SELECT e.id
       FROM edukator e
       WHERE (
         EXISTS (
           SELECT 1 FROM jadwal j
           WHERE j.edukator_id = e.id
             AND ${jadwalCondition}
         )
         OR EXISTS (
           SELECT 1 FROM presensi p2
           WHERE p2.edukator_id = e.id
             AND ${presensiCondition}
         )
       )
       AND e.is_active = 1
       ${filterWhere}
       GROUP BY e.id
     ) AS counted`,
    [...countInitialParams, ...filterParams]
  );

  const params = [...initialParams, ...filterParams];
  let dataQuery = `SELECT e.id, e.nama,
            SUM(
              CASE
                WHEN p.id IS NOT NULL
                 AND ${caseCondition}
                THEN 1
                ELSE 0
              END
            ) AS hadir_bulan_ini
     FROM edukator e
     LEFT JOIN presensi p ON p.edukator_id = e.id
     WHERE (
       EXISTS (
         SELECT 1 FROM jadwal j
         WHERE j.edukator_id = e.id
           AND ${jadwalCondition}
       )
       OR EXISTS (
         SELECT 1 FROM presensi p2
         WHERE p2.edukator_id = e.id
           AND ${presensiCondition}
       )
     )
     AND e.is_active = 1
     ${filterWhere}
     GROUP BY e.id
     ORDER BY e.nama ASC`;
  const dataParams = [...params];
  if (limit !== undefined) {
    dataQuery += " LIMIT ? OFFSET ?";
    dataParams.push(limit, offset || 0);
  }
  const [rows] = await db.query(dataQuery, dataParams);
  return { rows, total };
};

const listPresensiDetail = async ({ edukatorId, cabangId, year, month, startDate, endDate }, { limit, offset } = {}) => {
  const params = [edukatorId];
  let where = "WHERE p.edukator_id = ?";
  if (cabangId) {
    where += " AND e.cabang_utama_id = ?";
    params.push(cabangId);
  }
  if (startDate && endDate) {
    where += " AND p.waktu_absen BETWEEN ? AND ?";
    params.push(toStartOfDay(startDate), toEndOfDay(endDate));
  } else if (year && month) {
    where += " AND YEAR(p.waktu_absen) = ? AND MONTH(p.waktu_absen) = ?";
    params.push(year, month);
  }

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total
     FROM presensi p
     JOIN edukator e ON e.id = p.edukator_id
     ${where}`,
    [...params]
  );

  let dataQuery = `SELECT p.id AS presensi_id,
            e.nama AS edukator_nama,
            DATE(p.waktu_absen) AS tanggal,
            p.catatan AS materi,
            p.latitude,
            p.longitude,
            p.waktu_absen,
            j.tipe_les,
            k.nama AS kelas_nama,
            (SELECT s2.nama FROM presensi_siswa ps2
             JOIN siswa s2 ON s2.id = ps2.siswa_id
             WHERE ps2.presensi_id = p.id LIMIT 1) AS siswa_nama,
            (SELECT pr2.nama FROM presensi_siswa ps2
             JOIN enrollment en2 ON en2.id = ps2.enrollment_id
             JOIN program pr2 ON pr2.id = en2.program_id
             WHERE ps2.presensi_id = p.id LIMIT 1) AS program_nama,
            (SELECT COUNT(*) FROM presensi_siswa ps2
             WHERE ps2.presensi_id = p.id AND ps2.status_presensi_siswa = '${PRESENSI_STATUS.HADIR}') AS hadir_count,
            (SELECT COUNT(*) FROM presensi_siswa ps3
             WHERE ps3.presensi_id = p.id AND ps3.status_presensi_siswa IN ('${PRESENSI_STATUS.TIDAK_HADIR}', '${PRESENSI_STATUS.IZIN}')) AS tidak_hadir_count,
            (SELECT COUNT(*) FROM presensi_siswa ps4 WHERE ps4.presensi_id = p.id) AS total_siswa
     FROM presensi p
     JOIN edukator e ON e.id = p.edukator_id
     LEFT JOIN jadwal j ON j.id = p.jadwal_id
     LEFT JOIN kelas k ON k.id = j.kelas_id
     ${where}
     ORDER BY p.waktu_absen DESC`;
  const dataParams = [...params];
  if (limit !== undefined) {
    dataQuery += " LIMIT ? OFFSET ?";
    dataParams.push(limit, offset || 0);
  }
  const [rows] = await db.query(dataQuery, dataParams);
  return { rows, total };
};

const createPresensiFromJadwal = async (jadwalId, userId, coords = {}) => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      const [jadwalRows] = await connection.query(
        `SELECT j.id, j.enrollment_id, j.edukator_id, j.status_jadwal, j.tipe_les, j.cabang_id
         FROM jadwal j
         JOIN edukator e ON e.id = j.edukator_id
         WHERE j.id = ? AND e.user_id = ?
         FOR UPDATE`,
        [jadwalId, userId]
      );
      const jadwal = jadwalRows[0];
      if (!jadwal) {
        throw new Error("Jadwal tidak ditemukan.");
      }
      if (jadwal.status_jadwal === JADWAL_STATUS.COMPLETED) {
        throw new Error("Jadwal sudah diabsen.");
      }

      const [presensiExisting] = await connection.query(
        "SELECT id FROM presensi WHERE jadwal_id = ? LIMIT 1 FOR UPDATE",
        [jadwalId]
      );
      if (presensiExisting.length) {
        throw new Error("Jadwal sudah diabsen.");
      }

    const [presensiResult] = await connection.query(
      `INSERT INTO presensi (jadwal_id, edukator_id, waktu_absen, latitude, longitude, catatan)
       VALUES (?, ?, NOW(), ?, ?, ?)`,
      [
        jadwalId,
        jadwal.edukator_id,
        coords.latitude ?? null,
        coords.longitude ?? null,
        coords.materi ?? null,
      ]
    );
      const presensiId = presensiResult.insertId;

      if (jadwal.enrollment_id) {
        const [siswaRows] = await connection.query(
          "SELECT siswa_id FROM enrollment WHERE id = ? LIMIT 1",
          [jadwal.enrollment_id]
        );
        const siswaId = siswaRows[0]?.siswa_id;
        if (siswaId) {
          const [countRows] = await connection.query(
            "SELECT COUNT(*) AS total FROM presensi_siswa WHERE enrollment_id = ?",
            [jadwal.enrollment_id]
          );
          const pertemuanKe = Number(countRows[0]?.total || 0) + 1;
          await connection.query(
            `INSERT INTO presensi_siswa (presensi_id, siswa_id, enrollment_id, pertemuan_ke, status_presensi_siswa)
             VALUES (?, ?, ?, ?, '${PRESENSI_STATUS.HADIR}')`,
            [presensiId, siswaId, jadwal.enrollment_id, pertemuanKe]
          );
        }
      }

      if (jadwal.enrollment_id) {
        await connection.query(
          `UPDATE enrollment
           SET sisa_pertemuan = GREATEST(total_pertemuan - (
             SELECT COUNT(*) FROM presensi_siswa WHERE enrollment_id = ?
           ), 0)
           WHERE id = ?`,
          [jadwal.enrollment_id, jadwal.enrollment_id]
        );

        // Auto-complete: jika sisa_pertemuan = 0, update status ke 'selesai'
        await connection.query(
          `UPDATE enrollment
           SET status_enrollment = '${ENROLLMENT_STATUS.SELESAI}'
           WHERE id = ? AND sisa_pertemuan = 0 AND status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'`,
          [jadwal.enrollment_id]
        );
      }

      if (jadwal.tipe_les === TIPE_LES.KELAS) {
        // Get all students in this class schedule
        const [kelasStudents] = await connection.query(
          `SELECT jks.id, jks.enrollment_id, jks.pertemuan_ke, e.siswa_id
           FROM jadwal_kelas_siswa jks
           JOIN enrollment e ON e.id = jks.enrollment_id
           WHERE jks.jadwal_id = ?`,
          [jadwalId]
        );

        // kehadiran is an array: [{ siswaId: 1, status: 'hadir' }, { siswaId: 2, status: 'tidak_hadir' }]
        const kehadiranMap = new Map();
        if (Array.isArray(coords.kehadiran)) {
          coords.kehadiran.forEach((k) => {
            kehadiranMap.set(Number(k.siswaId), k.status || PRESENSI_STATUS.HADIR);
          });
        }

        // Process each student's attendance
        for (const student of kelasStudents) {
          // Default to 'hadir' if no kehadiran data provided (backward compatibility)
          const status = kehadiranMap.get(student.siswa_id) || PRESENSI_STATUS.HADIR;
          const jksStatus = status === PRESENSI_STATUS.HADIR ? PRESENSI_STATUS.HADIR : status === PRESENSI_STATUS.IZIN ? PRESENSI_STATUS.IZIN : PRESENSI_STATUS.TIDAK_HADIR;

          // Update jadwal_kelas_siswa status
          await connection.query(
            "UPDATE jadwal_kelas_siswa SET status = ? WHERE id = ?",
            [jksStatus, student.id]
          );

          // Insert presensi_siswa record for kelas too
          await connection.query(
            `INSERT INTO presensi_siswa (presensi_id, siswa_id, enrollment_id, pertemuan_ke, status_presensi_siswa)
             VALUES (?, ?, ?, ?, ?)`,
            [presensiId, student.siswa_id, student.enrollment_id, student.pertemuan_ke, status]
          );

          // Only decrement sisa_pertemuan if student was present (hadir)
          if (status === PRESENSI_STATUS.HADIR) {
            await connection.query(
              `UPDATE enrollment
               SET sisa_pertemuan = GREATEST(sisa_pertemuan - 1, 0)
               WHERE id = ?`,
              [student.enrollment_id]
            );
          }
        }

        // Auto-complete: jika sisa_pertemuan = 0, update status ke 'selesai' untuk kelas
        await connection.query(
          `UPDATE enrollment
           SET status_enrollment = '${ENROLLMENT_STATUS.SELESAI}'
           WHERE sisa_pertemuan = 0 AND status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'
           AND id IN (SELECT enrollment_id FROM jadwal_kelas_siswa WHERE jadwal_id = ?)`,
          [jadwalId]
        );
      }

      await connection.query(
        `UPDATE jadwal SET status_jadwal = '${JADWAL_STATUS.COMPLETED}' WHERE id = ?`,
        [jadwalId]
      );

      await penggajianService.createTransaksiFromPresensi(
        connection,
        presensiId,
        jadwal,
        jadwal.cabang_id
      );

      await connection.commit();
      connection.release();
      return { id: presensiId };
    } catch (err) {
      await connection.rollback();
      connection.release();

      if (err && err.code === "ER_LOCK_DEADLOCK" && attempt < maxRetries - 1) {
        attempt += 1;
        await new Promise((resolve) => setTimeout(resolve, 150 * attempt));
        continue;
      }
      throw err;
    }
  }
  throw new Error("Gagal menyimpan presensi. Silakan coba lagi.");
};

module.exports = {
  listPresensiSummary,
  listPresensiDetail,
  listSiswaHistory,
  listSiswaHistoryByProgram,
  getEdukatorIdByUserId,
  getSiswaIdByUserId,
  createPresensiFromJadwal,
  getKelasSiswaByJadwal,
};
