const db = require("../db");
const notifikasiService = require("./notifikasi.service");

const getSiswaIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM siswa WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
};

const listPembayaran = async ({ cabangId, siswaId, year, month }) => {
  const params = [];
  let where = "WHERE 1=1";
  if (cabangId) {
    where += " AND p.cabang_id = ?";
    params.push(cabangId);
  }
  if (siswaId) {
    where += " AND t.siswa_id = ?";
    params.push(siswaId);
  }
  if (year && month) {
    where += " AND YEAR(p.tanggal_bayar) = ? AND MONTH(p.tanggal_bayar) = ?";
    params.push(year, month);
  }

  const [rows] = await db.query(
    `SELECT p.id, p.tagihan_id, p.cabang_id, p.nominal, p.metode_bayar,
            p.tanggal_bayar, p.bukti_bayar, p.catatan, p.created_by, p.created_at,
            t.nominal AS tagihan_nominal, t.status_tagihan,
            s.nama AS siswa_nama, pr.nama AS program_nama
     FROM pembayaran p
     JOIN tagihan t ON t.id = p.tagihan_id
     JOIN siswa s ON s.id = t.siswa_id
     JOIN enrollment en ON en.id = t.enrollment_id
     JOIN program pr ON pr.id = en.program_id
     ${where}
     ORDER BY p.created_at DESC`,
    params
  );
  return rows;
};

const createPembayaran = async (payload, cabangId, userId) => {
  const { tagihan_id, nominal, metode_bayar, tanggal_bayar, bukti_bayar, catatan } = payload;

  if (!tagihan_id) {
    throw new Error("Tagihan wajib dipilih.");
  }
  if (!nominal || Number.isNaN(Number(nominal))) {
    throw new Error("Nominal pembayaran tidak valid.");
  }
  if (!metode_bayar || !["cash", "transfer"].includes(metode_bayar)) {
    throw new Error("Metode pembayaran tidak valid.");
  }
  if (!tanggal_bayar) {
    throw new Error("Tanggal pembayaran wajib diisi.");
  }

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT id, cabang_id, nominal FROM tagihan WHERE id = ?`,
      [tagihan_id]
    );
    const tagihan = rows[0];
    if (!tagihan) {
      throw new Error("Tagihan tidak ditemukan.");
    }
    if (cabangId && tagihan.cabang_id !== cabangId) {
      throw new Error("Cabang tidak sesuai.");
    }

    await conn.query(
      `INSERT INTO pembayaran
        (tagihan_id, cabang_id, nominal, metode_bayar, tanggal_bayar, bukti_bayar, catatan, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        tagihan_id,
        tagihan.cabang_id,
        Number(nominal),
        metode_bayar,
        tanggal_bayar,
        bukti_bayar || null,
        catatan || null,
        userId,
      ]
    );

    const [sumRows] = await conn.query(
      `SELECT IFNULL(SUM(nominal), 0) AS total FROM pembayaran WHERE tagihan_id = ?`,
      [tagihan_id]
    );
    const total = Number(sumRows[0]?.total || 0);
    const status = total >= Number(tagihan.nominal) ? "lunas" : "cicilan";
    await conn.query(`UPDATE tagihan SET status_tagihan = ? WHERE id = ?`, [status, tagihan_id]);

    const [detailRows] = await conn.query(
      `SELECT t.id, t.cabang_id, t.status_tagihan,
              s.nama AS siswa_nama, u.id AS user_id, p.nama AS program_nama
       FROM tagihan t
       JOIN siswa s ON s.id = t.siswa_id
       JOIN users u ON u.id = s.user_id
       JOIN enrollment en ON en.id = t.enrollment_id
       JOIN program p ON p.id = en.program_id
       WHERE t.id = ?`,
      [tagihan_id]
    );
    const detail = detailRows[0];
    if (detail) {
      const statusLabel = detail.status_tagihan === "lunas" ? "lunas" : "cicilan";
      await notifikasiService.insertNotifikasi(conn, {
        user_id: detail.user_id,
        tipe_notifikasi: "tagihan",
        judul: "Pembayaran diterima",
        pesan: `Pembayaran program ${detail.program_nama} sudah ${statusLabel}.`,
        data_ref: { tagihan_id: detail.id, status: detail.status_tagihan },
      });

      const [adminRows] = await conn.query(
        `SELECT id FROM users
         WHERE role = 'admin_cabang' AND cabang_id = ? AND is_active = 1`,
        [detail.cabang_id]
      );
      for (const admin of adminRows) {
        await notifikasiService.insertNotifikasi(conn, {
          user_id: admin.id,
          tipe_notifikasi: "tagihan",
          judul: "Pembayaran diterima",
          pesan: `Pembayaran ${detail.siswa_nama} untuk ${detail.program_nama} sudah ${statusLabel}.`,
          data_ref: { tagihan_id: detail.id, status: detail.status_tagihan },
        });
      }
    }

    await conn.commit();
    return { status, total };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  getSiswaIdByUserId,
  listPembayaran,
  createPembayaran,
};
