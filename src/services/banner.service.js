const db = require("../db");
const { deleteFile } = require("../middlewares/upload.middleware");

const listBanners = async () => {
  const [rows] = await db.query(
    "SELECT * FROM banner ORDER BY urutan ASC, id ASC"
  );
  return rows;
};

const getActiveBanners = async () => {
  const [rows] = await db.query(
    "SELECT id, gambar, judul, link_url FROM banner WHERE is_active = 1 ORDER BY urutan ASC, id ASC"
  );
  return rows;
};

const getBannerById = async (id) => {
  const [rows] = await db.query("SELECT * FROM banner WHERE id = ?", [id]);
  return rows[0] || null;
};

const createBanner = async (payload) => {
  const { gambar, judul, link_url, urutan, is_active } = payload;
  const [result] = await db.query(
    `INSERT INTO banner (gambar, judul, link_url, urutan, is_active)
     VALUES (?, ?, ?, ?, ?)`,
    [gambar, judul || null, link_url || null, urutan || 0, is_active ?? 1]
  );
  return { id: result.insertId };
};

const updateBanner = async (id, payload, existing) => {
  const gambar = payload.gambar || existing.gambar;
  const judul = typeof payload.judul !== "undefined" ? payload.judul : existing.judul;
  const link_url = typeof payload.link_url !== "undefined" ? payload.link_url : existing.link_url;
  const urutan = typeof payload.urutan !== "undefined" ? Number(payload.urutan) : existing.urutan;
  const is_active = typeof payload.is_active !== "undefined" ? (payload.is_active ? 1 : 0) : existing.is_active;

  // Delete old image if replaced
  if (payload.gambar && existing.gambar && payload.gambar !== existing.gambar) {
    deleteFile(existing.gambar);
  }

  await db.query(
    `UPDATE banner SET gambar = ?, judul = ?, link_url = ?, urutan = ?, is_active = ? WHERE id = ?`,
    [gambar, judul || null, link_url || null, urutan, is_active, id]
  );
  return { id };
};

const deleteBanner = async (id) => {
  const banner = await getBannerById(id);
  if (banner && banner.gambar) {
    deleteFile(banner.gambar);
  }
  await db.query("DELETE FROM banner WHERE id = ?", [id]);
};

const reorderBanners = async (orderedIds) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    for (let i = 0; i < orderedIds.length; i++) {
      await conn.query("UPDATE banner SET urutan = ? WHERE id = ?", [i, orderedIds[i]]);
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
  listBanners,
  getActiveBanners,
  getBannerById,
  createBanner,
  updateBanner,
  deleteBanner,
  reorderBanners,
};
