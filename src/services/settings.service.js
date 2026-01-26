const bcrypt = require("bcryptjs");
const db = require("../db");

const getCabangProfile = async (cabangId) => {
  const [rows] = await db.query(
    `SELECT c.id, c.kode, c.nama, c.alamat, c.telepon, c.tanggal_jatuh_tempo, c.is_active,
            u.id AS admin_user_id, u.email AS admin_email, u.is_active AS admin_is_active
     FROM cabang c
     LEFT JOIN users u ON u.cabang_id = c.id AND u.role = 'admin_cabang'
     WHERE c.id = ?
     LIMIT 1`,
    [cabangId]
  );
  return rows[0] || null;
};

const updateCabangProfile = async (cabangId, payload, { allowKode }) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [existingRows] = await conn.query(
      "SELECT id, kode, nama, alamat, telepon, tanggal_jatuh_tempo, is_active FROM cabang WHERE id = ?",
      [cabangId]
    );
    const existing = existingRows[0];
    if (!existing) {
      throw new Error("Cabang tidak ditemukan.");
    }

    const updates = [];
    const params = [];

    if (allowKode && typeof payload.kode !== "undefined") {
      updates.push("kode = ?");
      params.push(payload.kode || existing.kode);
    }
    if (typeof payload.nama !== "undefined") {
      updates.push("nama = ?");
      params.push(payload.nama || existing.nama);
    }
    if (typeof payload.alamat !== "undefined") {
      updates.push("alamat = ?");
      params.push(payload.alamat || null);
    }
    if (typeof payload.telepon !== "undefined") {
      updates.push("telepon = ?");
      params.push(payload.telepon || null);
    }
    if (typeof payload.tanggal_jatuh_tempo !== "undefined") {
      updates.push("tanggal_jatuh_tempo = ?");
      params.push(Number(payload.tanggal_jatuh_tempo) || existing.tanggal_jatuh_tempo);
    }
    if (typeof payload.is_active !== "undefined") {
      updates.push("is_active = ?");
      params.push(payload.is_active ? 1 : 0);
    }

    if (updates.length) {
      params.push(cabangId);
      await conn.query(`UPDATE cabang SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    const [adminRows] = await conn.query(
      "SELECT id, email FROM users WHERE role = 'admin_cabang' AND cabang_id = ? LIMIT 1",
      [cabangId]
    );
    const admin = adminRows[0] || null;

    const adminEmail = (payload.admin_email || "").trim();
    const adminPassword = payload.admin_password || "";

    if (adminEmail) {
      const [dupeRows] = await conn.query(
        "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
        [adminEmail, admin ? admin.id : 0]
      );
      if (dupeRows.length) {
        throw new Error("Email admin sudah digunakan.");
      }
    }

    if (!admin) {
      if (adminEmail || adminPassword) {
        if (!adminEmail || !adminPassword) {
          throw new Error("Email dan password admin wajib diisi.");
        }
        const hashed = await bcrypt.hash(String(adminPassword), 10);
        await conn.query(
          `INSERT INTO users (email, password, role, cabang_id, is_active)
           VALUES (?, ?, 'admin_cabang', ?, ?)`,
          [adminEmail, hashed, cabangId, payload.admin_is_active ? 1 : 0]
        );
      }
    } else {
      const userUpdates = [];
      const userParams = [];

      if (adminEmail) {
        userUpdates.push("email = ?");
        userParams.push(adminEmail);
      }
      if (adminPassword) {
        const hashed = await bcrypt.hash(String(adminPassword), 10);
        userUpdates.push("password = ?");
        userParams.push(hashed);
      }
      if (typeof payload.admin_is_active !== "undefined") {
        userUpdates.push("is_active = ?");
        userParams.push(payload.admin_is_active ? 1 : 0);
      }

      if (userUpdates.length) {
        userParams.push(admin.id);
        await conn.query(`UPDATE users SET ${userUpdates.join(", ")} WHERE id = ?`, userParams);
      }
    }

    await conn.commit();
    return getCabangProfile(cabangId);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = {
  getCabangProfile,
  updateCabangProfile,
};
