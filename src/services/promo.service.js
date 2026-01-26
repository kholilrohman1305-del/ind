const db = require("../db");

const listPromo = async ({ cabangId, keyword }) => {
  const params = [cabangId];
  let where = "WHERE pr.cabang_id = ?";
  if (keyword) {
    where += " AND (pr.nama LIKE ? OR p.nama LIKE ?)";
    const key = `%${keyword}%`;
    params.push(key, key);
  }

  const [rows] = await db.query(
    `SELECT pr.id, pr.nama, pr.program_id, p.nama AS program_nama,
            pr.tipe_diskon, pr.nilai, pr.tanggal_mulai, pr.tanggal_selesai,
            pr.is_active, pr.created_at
     FROM promo pr
     JOIN program p ON p.id = pr.program_id
     ${where}
     ORDER BY pr.created_at DESC, pr.id DESC`,
    params
  );
  return rows;
};

const createPromo = async ({
  cabangId,
  programId,
  nama,
  tipeDiskon,
  nilai,
  tanggalMulai,
  tanggalSelesai,
  isActive,
}) => {
  if (!programId) throw new Error("Program wajib dipilih.");
  if (!nama || !String(nama).trim()) throw new Error("Nama promo wajib diisi.");
  if (!["percent", "fixed"].includes(tipeDiskon)) {
    throw new Error("Tipe diskon tidak valid.");
  }
  const nilaiDiskon = Number(nilai || 0);
  if (Number.isNaN(nilaiDiskon) || nilaiDiskon <= 0) {
    throw new Error("Nilai diskon harus lebih besar dari 0.");
  }
  if (!tanggalMulai || !tanggalSelesai) {
    throw new Error("Periode promo wajib diisi.");
  }
  if (new Date(tanggalMulai) > new Date(tanggalSelesai)) {
    throw new Error("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");
  }
  const activeFlag = isActive === undefined ? 1 : Number(isActive ? 1 : 0);

  const [result] = await db.query(
    `INSERT INTO promo
      (cabang_id, program_id, nama, tipe_diskon, nilai, tanggal_mulai, tanggal_selesai, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      cabangId,
      programId,
      String(nama).trim(),
      tipeDiskon,
      nilaiDiskon,
      tanggalMulai,
      tanggalSelesai,
      activeFlag,
    ]
  );
  return { id: result.insertId };
};

const updatePromo = async ({
  cabangId,
  id,
  programId,
  nama,
  tipeDiskon,
  nilai,
  tanggalMulai,
  tanggalSelesai,
  isActive,
}) => {
  if (!id) throw new Error("Promo tidak ditemukan.");
  if (!programId) throw new Error("Program wajib dipilih.");
  if (!nama || !String(nama).trim()) throw new Error("Nama promo wajib diisi.");
  if (!["percent", "fixed"].includes(tipeDiskon)) {
    throw new Error("Tipe diskon tidak valid.");
  }
  const nilaiDiskon = Number(nilai || 0);
  if (Number.isNaN(nilaiDiskon) || nilaiDiskon <= 0) {
    throw new Error("Nilai diskon harus lebih besar dari 0.");
  }
  if (!tanggalMulai || !tanggalSelesai) {
    throw new Error("Periode promo wajib diisi.");
  }
  if (new Date(tanggalMulai) > new Date(tanggalSelesai)) {
    throw new Error("Tanggal mulai tidak boleh lebih besar dari tanggal selesai.");
  }
  const activeFlag = isActive === undefined ? 1 : Number(isActive ? 1 : 0);

  await db.query(
    `UPDATE promo
     SET program_id = ?, nama = ?, tipe_diskon = ?, nilai = ?,
         tanggal_mulai = ?, tanggal_selesai = ?, is_active = ?
     WHERE id = ? AND cabang_id = ?`,
    [
      programId,
      String(nama).trim(),
      tipeDiskon,
      nilaiDiskon,
      tanggalMulai,
      tanggalSelesai,
      activeFlag,
      id,
      cabangId,
    ]
  );
  return { id };
};

const deletePromo = async ({ cabangId, id }) => {
  await db.query(`DELETE FROM promo WHERE id = ? AND cabang_id = ?`, [id, cabangId]);
};

module.exports = {
  listPromo,
  createPromo,
  updatePromo,
  deletePromo,
};
