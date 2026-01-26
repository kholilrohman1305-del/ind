const db = require("../db");

const listManajemen = async (cabangId) => {
  const params = [];
  let where = "";
  if (cabangId) {
    where = "WHERE cabang_id = ?";
    params.push(cabangId);
  } else {
    where = "WHERE cabang_id IS NULL";
  }
  const [rows] = await db.query(
    `SELECT id, cabang_id, nama, gaji_tambahan, created_at
     FROM manajemen
     ${where}
     ORDER BY nama ASC`,
    params
  );
  return rows;
};

const createManajemen = async ({ nama, cabangId }) => {
  if (!nama || !String(nama).trim()) {
    throw new Error("Nama manajemen wajib diisi.");
  }
  const value = String(nama).trim();
  const [result] = await db.query(
    "INSERT INTO manajemen (cabang_id, nama) VALUES (?, ?)",
    [cabangId || null, value]
  );
  return { id: result.insertId };
};

const deleteManajemen = async ({ id, cabangId }) => {
  const params = [id];
  let where = "WHERE id = ?";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  }
  await db.query(`UPDATE edukator SET manajemen_id = NULL WHERE manajemen_id = ?`, [id]);
  await db.query(`DELETE FROM manajemen ${where}`, params);
};

const updateManajemenSalary = async ({ id, gajiTambahan, cabangId }) => {
  const params = [Number(gajiTambahan || 0), id];
  let where = "WHERE id = ?";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  }
  await db.query(`UPDATE manajemen SET gaji_tambahan = ? ${where}`, params);
};

const assignManajemenToEdukator = async ({ edukatorId, manajemenId, cabangId }) => {
  const params = [manajemenId || null, edukatorId];
  let where = "WHERE id = ?";
  if (cabangId) {
    where += " AND cabang_utama_id = ?";
    params.push(cabangId);
  }
  await db.query(`UPDATE edukator SET manajemen_id = ? ${where}`, params);
};

module.exports = {
  listManajemen,
  createManajemen,
  deleteManajemen,
  updateManajemenSalary,
  assignManajemenToEdukator,
};
