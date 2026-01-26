const db = require("../db");

const listPengeluaran = async ({ cabangId, month, year }) => {
  const targetYear = Number(year || new Date().getFullYear());
  const targetMonth = Number(month || new Date().getMonth() + 1);
  const params = [targetYear, targetMonth];
  let where = "WHERE YEAR(tanggal) = ? AND MONTH(tanggal) = ?";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  } else {
    where += " AND cabang_id IS NULL";
  }

  const [rows] = await db.query(
    `SELECT id, cabang_id, kategori, deskripsi, nominal, tanggal, created_at
     FROM pengeluaran
     ${where}
     ORDER BY tanggal DESC, id DESC`,
    params
  );
  return rows;
};

const createPengeluaran = async ({ cabangId, kategori, deskripsi, nominal, tanggal }) => {
  if (!kategori || !String(kategori).trim()) {
    throw new Error("Kategori wajib diisi.");
  }
  if (!tanggal) {
    throw new Error("Tanggal wajib diisi.");
  }
  const nominalValue = Number(nominal || 0);
  const [result] = await db.query(
    `INSERT INTO pengeluaran (cabang_id, kategori, deskripsi, nominal, tanggal)
     VALUES (?, ?, ?, ?, ?)`,
    [cabangId || null, String(kategori).trim(), deskripsi || null, nominalValue, tanggal]
  );
  return { id: result.insertId };
};

const deletePengeluaran = async ({ id, cabangId }) => {
  const params = [id];
  let where = "WHERE id = ?";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  }
  await db.query(`DELETE FROM pengeluaran ${where}`, params);
};

module.exports = {
  listPengeluaran,
  createPengeluaran,
  deletePengeluaran,
};
