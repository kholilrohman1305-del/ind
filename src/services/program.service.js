const db = require("../db");

const listProgram = async (cabangId) => {
  if (cabangId) {
    const [rows] = await db.query(
      `SELECT p.id, p.cabang_id, p.mapel_id, p.nama, p.tipe_les, p.jumlah_pertemuan,
              p.harga, p.deskripsi, p.is_active, p.created_at, m.nama as mapel_nama
       FROM program p
       LEFT JOIN mapel m ON m.id = p.mapel_id
       WHERE p.cabang_id = ?
       ORDER BY p.created_at DESC`,
      [cabangId]
    );
    return rows;
  }

  const [rows] = await db.query(
    `SELECT p.id, p.cabang_id, p.mapel_id, p.nama, p.tipe_les, p.jumlah_pertemuan,
            p.harga, p.deskripsi, p.is_active, p.created_at, m.nama as mapel_nama
     FROM program p
     LEFT JOIN mapel m ON m.id = p.mapel_id
     ORDER BY p.created_at DESC`
  );
  return rows;
};

const getProgramById = async (id) => {
  const [rows] = await db.query(
    `SELECT p.id, p.cabang_id, p.mapel_id, p.nama, p.tipe_les, p.jumlah_pertemuan,
            p.harga, p.deskripsi, p.is_active, p.created_at, m.nama as mapel_nama
     FROM program p
     LEFT JOIN mapel m ON m.id = p.mapel_id
     WHERE p.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const createProgram = async (payload) => {
  const {
    cabang_id,
    mapel_id,
    nama,
    tipe_les,
    jumlah_pertemuan,
    harga,
    deskripsi,
    is_active,
  } = payload;

  if (!nama || !tipe_les || typeof harga === "undefined") {
    throw new Error("Nama, tipe les, dan harga wajib diisi.");
  }

  const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;
  const mapelValue = mapel_id ? Number(mapel_id) : null;
  const pertemuanValue = jumlah_pertemuan ? Number(jumlah_pertemuan) : null;

  const [result] = await db.query(
    `INSERT INTO program
      (cabang_id, mapel_id, nama, tipe_les, jumlah_pertemuan, harga, deskripsi, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cabang_id,
      mapelValue,
      nama,
      tipe_les,
      pertemuanValue,
      Number(harga),
      deskripsi || null,
      activeFlag,
    ]
  );
  return { id: result.insertId };
};

const updateProgram = async (id, payload, existing) => {
  const mapelValue =
    typeof payload.mapel_id !== "undefined" ? Number(payload.mapel_id) : existing.mapel_id;
  const pertemuanValue =
    typeof payload.jumlah_pertemuan !== "undefined"
      ? Number(payload.jumlah_pertemuan)
      : existing.jumlah_pertemuan;

  const activeFlag =
    typeof payload.is_active !== "undefined" ? (payload.is_active ? 1 : 0) : existing.is_active;

  await db.query(
    `UPDATE program SET
      mapel_id = ?, nama = ?, tipe_les = ?, jumlah_pertemuan = ?, harga = ?, deskripsi = ?, is_active = ?
     WHERE id = ?`,
    [
      mapelValue || null,
      payload.nama || existing.nama,
      payload.tipe_les || existing.tipe_les,
      pertemuanValue || null,
      typeof payload.harga !== "undefined" ? Number(payload.harga) : existing.harga,
      typeof payload.deskripsi !== "undefined" ? payload.deskripsi : existing.deskripsi,
      activeFlag,
      id,
    ]
  );
  return { id };
};

const deleteProgram = async (id) => {
  await db.query("DELETE FROM program WHERE id = ?", [id]);
};

module.exports = {
  listProgram,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
};
