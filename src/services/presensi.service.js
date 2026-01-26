const db = require("../db");
const penggajianService = require("./penggajian.service");

const getEdukatorIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM edukator WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
};

const getSiswaIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM siswa WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
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
       AND jks.status = 'selesai'
     ORDER BY tanggal DESC, jam_mulai DESC`,
    [siswaId, siswaId]
  );
  return rows;
};

const listPresensiSummary = async ({ cabangId, search, year, month, edukatorId }) => {
  const params = [year, month, year, month, year, month];
  let where = "WHERE e.is_active = 1";
  if (cabangId) {
    where += " AND e.cabang_utama_id = ?";
    params.push(cabangId);
  }
  if (search) {
    where += " AND e.nama LIKE ?";
    params.push(`%${search}%`);
  }
  if (edukatorId) {
    where += " AND e.id = ?";
    params.push(edukatorId);
  }

  const [rows] = await db.query(
    `SELECT e.id, e.nama,
            SUM(
              CASE
                WHEN p.id IS NOT NULL
                 AND YEAR(p.waktu_absen) = ?
                 AND MONTH(p.waktu_absen) = ?
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
           AND YEAR(j.tanggal) = ?
           AND MONTH(j.tanggal) = ?
       )
       OR EXISTS (
         SELECT 1 FROM presensi p2
         WHERE p2.edukator_id = e.id
           AND YEAR(p2.waktu_absen) = ?
           AND MONTH(p2.waktu_absen) = ?
       )
     )
     ${where.replace("WHERE", "AND")}
     GROUP BY e.id
     ORDER BY e.nama ASC`,
    params
  );
  return rows;
};

const listPresensiDetail = async ({ edukatorId, cabangId, year, month }) => {
  const params = [edukatorId];
  let where = "WHERE p.edukator_id = ?";
  if (cabangId) {
    where += " AND e.cabang_utama_id = ?";
    params.push(cabangId);
  }
  if (year && month) {
    where += " AND YEAR(p.waktu_absen) = ? AND MONTH(p.waktu_absen) = ?";
    params.push(year, month);
  }

  const [rows] = await db.query(
    `SELECT s.nama AS siswa_nama,
            e.nama AS edukator_nama,
            DATE(p.waktu_absen) AS tanggal,
            s.kelas AS kelas,
            pr.nama AS program_nama,
            p.catatan AS materi,
            p.latitude,
            p.longitude,
            p.waktu_absen
     FROM presensi p
     JOIN edukator e ON e.id = p.edukator_id
     LEFT JOIN presensi_siswa ps ON ps.presensi_id = p.id
     LEFT JOIN siswa s ON s.id = ps.siswa_id
     LEFT JOIN enrollment en ON en.id = ps.enrollment_id
     LEFT JOIN program pr ON pr.id = en.program_id
     ${where}
     ORDER BY p.waktu_absen DESC`,
    params
  );
  return rows;
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
      if (jadwal.status_jadwal === "completed") {
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
             VALUES (?, ?, ?, ?, 'hadir')`,
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
      }

      if (jadwal.tipe_les === "kelas") {
        await connection.query(
          "UPDATE jadwal_kelas_siswa SET status = 'selesai' WHERE jadwal_id = ?",
          [jadwalId]
        );

        await connection.query(
          `UPDATE enrollment e
           JOIN (
             SELECT jks.enrollment_id, SUM(jks.status = 'selesai') AS selesai_count
             FROM jadwal_kelas_siswa jks
             WHERE jks.enrollment_id IN (
               SELECT enrollment_id FROM jadwal_kelas_siswa WHERE jadwal_id = ?
             )
             GROUP BY jks.enrollment_id
           ) x ON x.enrollment_id = e.id
           SET e.sisa_pertemuan = GREATEST(e.total_pertemuan - x.selesai_count, 0)`,
          [jadwalId]
        );
      }

      await connection.query(
        "UPDATE jadwal SET status_jadwal = 'completed' WHERE id = ?",
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
  getEdukatorIdByUserId,
  getSiswaIdByUserId,
  createPresensiFromJadwal,
};
