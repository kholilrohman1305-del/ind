const bcrypt = require("bcryptjs");
const db = require("../db");

const listAdminCabang = async () => {
  const [rows] = await db.query(
    `SELECT u.id, u.email, u.is_active, u.created_at,
            c.id AS cabang_id, c.kode AS cabang_kode, c.nama AS cabang_nama
     FROM users u
     LEFT JOIN cabang c ON c.id = u.cabang_id
     WHERE u.role = 'admin_cabang'
     ORDER BY c.nama ASC, u.email ASC`
  );
  return rows || [];
};

const ensureAdminCabang = async (userId) => {
  const [rows] = await db.query(
    "SELECT id, role FROM users WHERE id = ? LIMIT 1",
    [userId]
  );
  const user = rows[0];
  if (!user || user.role !== "admin_cabang") {
    throw new Error("User admin cabang tidak ditemukan.");
  }
  return user;
};

const resetAdminPassword = async (userId, password) => {
  await ensureAdminCabang(userId);
  const hashed = await bcrypt.hash(String(password), 10);
  await db.query("UPDATE users SET password = ? WHERE id = ?", [hashed, userId]);
};

const updateAdminStatus = async (userId, isActive) => {
  await ensureAdminCabang(userId);
  await db.query("UPDATE users SET is_active = ? WHERE id = ?", [
    isActive ? 1 : 0,
    userId,
  ]);
};

module.exports = {
  listAdminCabang,
  resetAdminPassword,
  updateAdminStatus,
};
