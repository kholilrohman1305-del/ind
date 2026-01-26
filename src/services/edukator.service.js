const bcrypt = require("bcryptjs");
const db = require("../db");

const normalizeMapelIds = (mapelIds) => {
  if (!mapelIds) return [];
  if (Array.isArray(mapelIds)) {
    return mapelIds.map((id) => Number(id)).filter(Boolean);
  }
  return String(mapelIds)
    .split(",")
    .map((id) => Number(id.trim()))
    .filter(Boolean);
};

const listEdukator = async (cabangId) => {
  if (cabangId) {
    const [rows] = await db.query(
      `SELECT e.id, e.user_id, e.nama, e.nik, e.telepon, e.alamat,
              e.pendidikan_terakhir, e.foto, e.cabang_utama_id, e.is_active,
              e.manajemen_id, mn.nama AS manajemen_nama,
              e.created_at, u.email,
              GROUP_CONCAT(m.id) as mapel_ids,
              GROUP_CONCAT(m.nama) as mapel_nama
       FROM edukator e
       LEFT JOIN users u ON u.id = e.user_id
       LEFT JOIN manajemen mn ON mn.id = e.manajemen_id
       LEFT JOIN edukator_mapel em ON em.edukator_id = e.id
       LEFT JOIN mapel m ON m.id = em.mapel_id
       WHERE e.cabang_utama_id = ?
       GROUP BY e.id
       ORDER BY e.created_at DESC`,
      [cabangId]
    );
    return rows;
  }

  const [rows] = await db.query(
    `SELECT e.id, e.user_id, e.nama, e.nik, e.telepon, e.alamat,
            e.pendidikan_terakhir, e.foto, e.cabang_utama_id, e.is_active,
            e.manajemen_id, mn.nama AS manajemen_nama,
            e.created_at, u.email,
            GROUP_CONCAT(m.id) as mapel_ids,
            GROUP_CONCAT(m.nama) as mapel_nama
     FROM edukator e
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN manajemen mn ON mn.id = e.manajemen_id
     LEFT JOIN edukator_mapel em ON em.edukator_id = e.id
     LEFT JOIN mapel m ON m.id = em.mapel_id
     GROUP BY e.id
     ORDER BY e.created_at DESC`
  );
  return rows;
};

const getEdukatorById = async (id) => {
  const [rows] = await db.query(
    `SELECT e.id, e.user_id, e.nama, e.nik, e.telepon, e.alamat,
            e.pendidikan_terakhir, e.foto, e.cabang_utama_id, e.is_active,
            e.manajemen_id, mn.nama AS manajemen_nama,
            e.created_at, u.email,
            GROUP_CONCAT(m.id) as mapel_ids,
            GROUP_CONCAT(m.nama) as mapel_nama
     FROM edukator e
     LEFT JOIN users u ON u.id = e.user_id
     LEFT JOIN manajemen mn ON mn.id = e.manajemen_id
     LEFT JOIN edukator_mapel em ON em.edukator_id = e.id
     LEFT JOIN mapel m ON m.id = em.mapel_id
     WHERE e.id = ?
     GROUP BY e.id`,
    [id]
  );
  return rows[0] || null;
};

const createEdukator = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      email,
      password,
      cabang_utama_id,
      nama,
      nik,
      telepon,
      alamat,
      pendidikan_terakhir,
      foto,
      is_active,
      mapel_ids,
    } = payload;

    if (!email || !password || !nama) {
      throw new Error("Email, password, dan nama wajib diisi.");
    }

    const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;
    const hashed = await bcrypt.hash(String(password), 10);

    const [userRes] = await conn.query(
      `INSERT INTO users (email, password, role, cabang_id, is_active)
       VALUES (?, ?, 'edukator', ?, ?)`,
      [email, hashed, cabang_utama_id, activeFlag]
    );

    const userId = userRes.insertId;

    const [edukatorRes] = await conn.query(
      `INSERT INTO edukator
        (user_id, nama, nik, telepon, alamat, pendidikan_terakhir, foto, cabang_utama_id, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        userId,
        nama,
        nik || null,
        telepon || null,
        alamat || null,
        pendidikan_terakhir || null,
        foto || null,
        cabang_utama_id,
        activeFlag,
      ]
    );

    const mapelList = normalizeMapelIds(mapel_ids);
    for (const mapelId of mapelList) {
      await conn.query(
        "INSERT INTO edukator_mapel (edukator_id, mapel_id) VALUES (?, ?)",
        [edukatorRes.insertId, mapelId]
      );
    }

    await conn.commit();
    return { id: edukatorRes.insertId, user_id: userId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateEdukator = async (id, payload, existing) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    if (payload.email) {
      await conn.query("UPDATE users SET email = ? WHERE id = ?", [payload.email, existing.user_id]);
    }

    if (payload.password) {
      const hashed = await bcrypt.hash(String(payload.password), 10);
      await conn.query("UPDATE users SET password = ? WHERE id = ?", [
        hashed,
        existing.user_id,
      ]);
    }

    if (typeof payload.is_active !== "undefined") {
      await conn.query("UPDATE users SET is_active = ? WHERE id = ?", [
        payload.is_active ? 1 : 0,
        existing.user_id,
      ]);
    }

    await conn.query(
      `UPDATE edukator SET
        nama = ?, nik = ?, telepon = ?, alamat = ?, pendidikan_terakhir = ?, foto = ?, is_active = ?
       WHERE id = ?`,
      [
        payload.nama || existing.nama,
        payload.nik || existing.nik,
        payload.telepon || existing.telepon,
        payload.alamat || existing.alamat,
        payload.pendidikan_terakhir || existing.pendidikan_terakhir,
        typeof payload.foto !== "undefined" ? payload.foto : existing.foto,
        typeof payload.is_active !== "undefined" ? (payload.is_active ? 1 : 0) : existing.is_active,
        id,
      ]
    );

    if (typeof payload.mapel_ids !== "undefined") {
      await conn.query("DELETE FROM edukator_mapel WHERE edukator_id = ?", [id]);
      const mapelList = normalizeMapelIds(payload.mapel_ids);
      for (const mapelId of mapelList) {
        await conn.query(
          "INSERT INTO edukator_mapel (edukator_id, mapel_id) VALUES (?, ?)",
          [id, mapelId]
        );
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

const deleteEdukator = async (id, userId) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query("DELETE FROM edukator_mapel WHERE edukator_id = ?", [id]);
    await conn.query("DELETE FROM edukator WHERE id = ?", [id]);
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

module.exports = {
  listEdukator,
  getEdukatorById,
  createEdukator,
  updateEdukator,
  deleteEdukator,
};
