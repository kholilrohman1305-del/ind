const bcrypt = require("bcryptjs");
const db = require("../db");

const listCabang = async () => {
  const [rows] = await db.query(
    `SELECT id, kode, nama, alamat, telepon, latitude, longitude, tanggal_jatuh_tempo,
            is_active, created_at
     FROM cabang
     ORDER BY created_at DESC`
  );
  return rows;
};

const getCabangById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, kode, nama, alamat, telepon, latitude, longitude, tanggal_jatuh_tempo,
            is_active, created_at
     FROM cabang
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

const createCabang = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      kode,
      nama,
      alamat,
      telepon,
      latitude,
      longitude,
      tanggal_jatuh_tempo,
      is_active,
      admin_email,
      admin_password,
    } = payload;

    if (!kode || !nama) {
      throw new Error("Kode dan nama cabang wajib diisi.");
    }

    const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;

    const [cabangRes] = await conn.query(
      `INSERT INTO cabang
        (kode, nama, alamat, telepon, latitude, longitude, tanggal_jatuh_tempo, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        kode,
        nama,
        alamat || null,
        telepon || null,
        latitude || null,
        longitude || null,
        tanggal_jatuh_tempo || 10,
        activeFlag,
      ]
    );

    const cabangId = cabangRes.insertId;
    let userId = null;

    if (admin_email && admin_password) {
      const hashed = await bcrypt.hash(String(admin_password), 10);
      const [userRes] = await conn.query(
        `INSERT INTO users (email, password, role, cabang_id, is_active)
         VALUES (?, ?, 'admin_cabang', ?, 1)`,
        [admin_email, hashed, cabangId]
      );
      userId = userRes.insertId;
    }

    await conn.commit();
    return { id: cabangId, user_id: userId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateCabang = async (id, payload, existing) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE cabang SET
        kode = ?, nama = ?, alamat = ?, telepon = ?, latitude = ?, longitude = ?,
        tanggal_jatuh_tempo = ?, is_active = ?
       WHERE id = ?`,
      [
        payload.kode || existing.kode,
        payload.nama || existing.nama,
        typeof payload.alamat !== "undefined" ? payload.alamat : existing.alamat,
        typeof payload.telepon !== "undefined" ? payload.telepon : existing.telepon,
        typeof payload.latitude !== "undefined" ? payload.latitude : existing.latitude,
        typeof payload.longitude !== "undefined" ? payload.longitude : existing.longitude,
        typeof payload.tanggal_jatuh_tempo !== "undefined"
          ? payload.tanggal_jatuh_tempo
          : existing.tanggal_jatuh_tempo,
        typeof payload.is_active !== "undefined"
          ? payload.is_active
            ? 1
            : 0
          : existing.is_active,
        id,
      ]
    );

    const adminEmail = (payload.admin_email || "").trim();
    const adminPassword = payload.admin_password || "";

    if (adminEmail || adminPassword) {
      const [adminRows] = await conn.query(
        "SELECT id, email FROM users WHERE role = 'admin_cabang' AND cabang_id = ? LIMIT 1",
        [id]
      );
      const admin = adminRows[0] || null;

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
        if (!adminEmail || !adminPassword) {
          throw new Error("Email dan password admin wajib diisi.");
        }
        const hashed = await bcrypt.hash(String(adminPassword), 10);
        await conn.query(
          `INSERT INTO users (email, password, role, cabang_id, is_active)
           VALUES (?, ?, 'admin_cabang', ?, 1)`,
          [adminEmail, hashed, id]
        );
      } else {
        const updates = [];
        const params = [];
        if (adminEmail) {
          updates.push("email = ?");
          params.push(adminEmail);
        }
        if (adminPassword) {
          const hashed = await bcrypt.hash(String(adminPassword), 10);
          updates.push("password = ?");
          params.push(hashed);
        }
        if (updates.length) {
          params.push(admin.id);
          await conn.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
        }
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

const deleteCabang = async (id) => {
  await db.query("DELETE FROM cabang WHERE id = ?", [id]);
};

module.exports = {
  listCabang,
  getCabangById,
  createCabang,
  updateCabang,
  deleteCabang,
};
