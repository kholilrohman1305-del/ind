const db = require("../db");

const listMapel = async () => {
  const [rows] = await db.query(
    `SELECT id, nama, deskripsi, is_active, created_at
     FROM mapel
     ORDER BY created_at DESC`
  );
  return rows;
};

const getMapelById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, nama, deskripsi, is_active, created_at
     FROM mapel
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

const createMapel = async (payload) => {
  const { nama, deskripsi, is_active } = payload;
  if (!nama) {
    throw new Error("Nama mapel wajib diisi.");
  }
  const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;
  const [result] = await db.query(
    `INSERT INTO mapel (nama, deskripsi, is_active)
     VALUES (?, ?, ?)`,
    [nama, deskripsi || null, activeFlag]
  );
  return { id: result.insertId };
};

const updateMapel = async (id, payload, existing) => {
  const activeFlag =
    typeof payload.is_active !== "undefined" ? (payload.is_active ? 1 : 0) : existing.is_active;
  await db.query(
    `UPDATE mapel SET nama = ?, deskripsi = ?, is_active = ? WHERE id = ?`,
    [
      payload.nama || existing.nama,
      typeof payload.deskripsi !== "undefined" ? payload.deskripsi : existing.deskripsi,
      activeFlag,
      id,
    ]
  );
};

const deleteMapel = async (id) => {
  await db.query("DELETE FROM mapel WHERE id = ?", [id]);
};

module.exports = {
  listMapel,
  getMapelById,
  createMapel,
  updateMapel,
  deleteMapel,
};
