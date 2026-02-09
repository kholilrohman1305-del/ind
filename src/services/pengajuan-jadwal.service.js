const db = require("../db");
const { PENGAJUAN_STATUS, JADWAL_STATUS } = require("../config/constants");

const listPengajuan = async (filters = {}) => {
  const { edukatorId, cabangId, status } = filters;
  const params = [];
  let whereClause = "WHERE 1=1";

  if (edukatorId) {
    whereClause += " AND pj.edukator_id = ?";
    params.push(edukatorId);
  }

  if (cabangId) {
    whereClause += " AND j.cabang_id = ?";
    params.push(cabangId);
  }

  if (status) {
    whereClause += " AND pj.status = ?";
    params.push(status);
  }

  const [rows] = await db.query(
    `SELECT
      pj.id,
      pj.jadwal_id,
      pj.edukator_id,
      e.nama AS edukator_nama,
      pj.tipe,
      pj.alasan,
      pj.tanggal_usulan,
      pj.jam_mulai_usulan,
      pj.jam_selesai_usulan,
      pj.status,
      pj.catatan_admin,
      pj.approved_by,
      u.email AS approved_by_email,
      pj.approved_at,
      pj.created_at,
      j.tanggal AS jadwal_tanggal,
      j.jam_mulai AS jadwal_jam_mulai,
      j.jam_selesai AS jadwal_jam_selesai,
      j.cabang_id AS jadwal_cabang_id,
      COALESCE(s.nama, k.nama) AS siswa_nama,
      pr.nama AS program_nama
    FROM pengajuan_jadwal pj
    INNER JOIN jadwal j ON j.id = pj.jadwal_id
    INNER JOIN edukator e ON e.id = pj.edukator_id
    LEFT JOIN enrollment en ON en.id = j.enrollment_id
    LEFT JOIN siswa s ON s.id = en.siswa_id
    LEFT JOIN kelas k ON k.id = j.kelas_id
    LEFT JOIN program pr ON pr.id = j.program_id
    LEFT JOIN users u ON u.id = pj.approved_by
    ${whereClause}
    ORDER BY pj.created_at DESC`,
    params
  );

  return rows;
};

const getPengajuanById = async (id) => {
  const [rows] = await db.query(
    `SELECT
      pj.id,
      pj.jadwal_id,
      pj.edukator_id,
      e.nama AS edukator_nama,
      pj.tipe,
      pj.alasan,
      pj.tanggal_usulan,
      pj.jam_mulai_usulan,
      pj.jam_selesai_usulan,
      pj.status,
      pj.catatan_admin,
      pj.approved_by,
      u.email AS approved_by_email,
      pj.approved_at,
      pj.created_at,
      j.tanggal AS jadwal_tanggal,
      j.jam_mulai AS jadwal_jam_mulai,
      j.jam_selesai AS jadwal_jam_selesai,
      j.cabang_id AS jadwal_cabang_id,
      COALESCE(s.nama, k.nama) AS siswa_nama,
      pr.nama AS program_nama
    FROM pengajuan_jadwal pj
    INNER JOIN jadwal j ON j.id = pj.jadwal_id
    INNER JOIN edukator e ON e.id = pj.edukator_id
    LEFT JOIN enrollment en ON en.id = j.enrollment_id
    LEFT JOIN siswa s ON s.id = en.siswa_id
    LEFT JOIN kelas k ON k.id = j.kelas_id
    LEFT JOIN program pr ON pr.id = j.program_id
    LEFT JOIN users u ON u.id = pj.approved_by
    WHERE pj.id = ?`,
    [id]
  );

  return rows[0] || null;
};

const createPengajuan = async (payload, edukatorId) => {
  const {
    jadwal_id,
    tipe,
    alasan,
    tanggal_usulan,
    jam_mulai_usulan,
    jam_selesai_usulan
  } = payload;

  // Validate jadwal exists and belongs to edukator
  const [jadwal] = await db.query(
    "SELECT id, edukator_id FROM jadwal WHERE id = ?",
    [jadwal_id]
  );

  if (!jadwal || jadwal.length === 0) {
    throw new Error("Jadwal tidak ditemukan");
  }

  if (jadwal[0].edukator_id !== edukatorId) {
    throw new Error("Anda tidak memiliki akses untuk jadwal ini");
  }

  // Validate tipe-specific fields
  if (tipe === "reschedule") {
    if (!tanggal_usulan || !jam_mulai_usulan || !jam_selesai_usulan) {
      throw new Error("Reschedule memerlukan tanggal dan jam usulan");
    }

    // Validasi tanggal tidak boleh masa lalu
    const proposedDate = new Date(tanggal_usulan);
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set ke awal hari ini (00:00:00)
    if (proposedDate < today) {
      throw new Error("Tanggal usulan tidak boleh hari yang sudah lewat");
    }
  }

  // Check for pending submissions on same jadwal
  const [pending] = await db.query(
    `SELECT id FROM pengajuan_jadwal
    WHERE jadwal_id = ? AND status = '${PENGAJUAN_STATUS.MENUNGGU}'`,
    [jadwal_id]
  );

  if (pending && pending.length > 0) {
    throw new Error("Sudah ada pengajuan pending untuk jadwal ini");
  }

  // Insert new submission
  const [result] = await db.query(
    `INSERT INTO pengajuan_jadwal
      (jadwal_id, edukator_id, tipe, alasan, tanggal_usulan, jam_mulai_usulan, jam_selesai_usulan, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, '${PENGAJUAN_STATUS.MENUNGGU}')`,
    [
      jadwal_id,
      edukatorId,
      tipe,
      alasan,
      tipe === "reschedule" ? tanggal_usulan : null,
      tipe === "reschedule" ? jam_mulai_usulan : null,
      tipe === "reschedule" ? jam_selesai_usulan : null
    ]
  );

  return { id: result.insertId };
};

const approvePengajuan = async (id, userId, catatanAdmin, cabangId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    // Lock row to prevent race conditions
    const [pengajuan] = await conn.query(
      "SELECT * FROM pengajuan_jadwal WHERE id = ? FOR UPDATE",
      [id]
    );

    if (!pengajuan || pengajuan.length === 0) {
      throw new Error("Pengajuan tidak ditemukan");
    }

    const pj = pengajuan[0];

    // Verify status is still pending
    if (pj.status !== PENGAJUAN_STATUS.MENUNGGU) {
      throw new Error("Pengajuan sudah diproses");
    }

    // Get jadwal info
    const [jadwal] = await conn.query(
      "SELECT * FROM jadwal WHERE id = ?",
      [pj.jadwal_id]
    );

    if (!jadwal || jadwal.length === 0) {
      throw new Error("Jadwal tidak ditemukan");
    }

    const jd = jadwal[0];

    // Verify cabang authorization
    if (cabangId && jd.cabang_id !== cabangId) {
      throw new Error("Anda tidak memiliki akses untuk jadwal ini");
    }

    // If reschedule, update jadwal and check for conflicts
    if (pj.tipe === "reschedule") {
      // Check for time conflicts
      const [conflicts] = await conn.query(
        `SELECT id FROM jadwal
        WHERE edukator_id = ?
          AND tanggal = ?
          AND status_jadwal = '${JADWAL_STATUS.SCHEDULED}'
          AND id != ?
          AND (
            (jam_mulai <= ? AND jam_selesai > ?) OR
            (jam_mulai < ? AND jam_selesai >= ?) OR
            (jam_mulai >= ? AND jam_selesai <= ?)
          )`,
        [
          pj.edukator_id,
          pj.tanggal_usulan,
          pj.jadwal_id,
          pj.jam_mulai_usulan, pj.jam_mulai_usulan,
          pj.jam_selesai_usulan, pj.jam_selesai_usulan,
          pj.jam_mulai_usulan, pj.jam_selesai_usulan
        ]
      );

      if (conflicts && conflicts.length > 0) {
        throw new Error("Jadwal usulan bentrok dengan jadwal lain");
      }

      // Update jadwal
      await conn.query(
        `UPDATE jadwal
        SET tanggal = ?, jam_mulai = ?, jam_selesai = ?
        WHERE id = ?`,
        [pj.tanggal_usulan, pj.jam_mulai_usulan, pj.jam_selesai_usulan, pj.jadwal_id]
      );
    } else if (pj.tipe === "izin") {
      // Mark jadwal as completed (izin means cancelled/skipped)
      await conn.query(
        `UPDATE jadwal SET status_jadwal = '${JADWAL_STATUS.COMPLETED}' WHERE id = ?`,
        [pj.jadwal_id]
      );
    }

    // Update pengajuan status
    await conn.query(
      `UPDATE pengajuan_jadwal
      SET status = '${PENGAJUAN_STATUS.DISETUJUI}',
          catatan_admin = ?,
          approved_by = ?,
          approved_at = NOW()
      WHERE id = ?`,
      [catatanAdmin || null, userId, id]
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const rejectPengajuan = async (id, userId, catatanAdmin, cabangId) => {
  // Get pengajuan
  const pengajuan = await getPengajuanById(id);
  if (!pengajuan) {
    throw new Error("Pengajuan tidak ditemukan");
  }

  // Verify status
  if (pengajuan.status !== PENGAJUAN_STATUS.MENUNGGU) {
    throw new Error("Pengajuan sudah diproses");
  }

  // Verify cabang authorization
  if (cabangId && pengajuan.jadwal_cabang_id !== cabangId) {
    throw new Error("Anda tidak memiliki akses untuk pengajuan ini");
  }

  // Update status
  await db.query(
    `UPDATE pengajuan_jadwal
    SET status = '${PENGAJUAN_STATUS.DITOLAK}',
        catatan_admin = ?,
        approved_by = ?,
        approved_at = NOW()
    WHERE id = ?`,
    [catatanAdmin, userId, id]
  );
};

const cancelPengajuan = async (id, edukatorId) => {
  // Get pengajuan
  const pengajuan = await getPengajuanById(id);
  if (!pengajuan) {
    throw new Error("Pengajuan tidak ditemukan");
  }

  // Verify ownership
  if (pengajuan.edukator_id !== edukatorId) {
    throw new Error("Anda tidak memiliki akses untuk pengajuan ini");
  }

  // Verify status
  if (pengajuan.status !== PENGAJUAN_STATUS.MENUNGGU) {
    throw new Error("Hanya pengajuan berstatus menunggu yang bisa dibatalkan");
  }

  // Delete pengajuan
  await db.query("DELETE FROM pengajuan_jadwal WHERE id = ?", [id]);
};

module.exports = {
  listPengajuan,
  getPengajuanById,
  createPengajuan,
  approvePengajuan,
  rejectPengajuan,
  cancelPengajuan,
};
