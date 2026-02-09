const bcrypt = require("bcryptjs");
const db = require("../db");
const { ROLES, PENDAFTARAN_STATUS } = require("../config/constants");

const findUserByEmail = async (email) => {
  const [rows] = await db.query(
    "SELECT id, email, password, role, cabang_id, is_active FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
};

const validateLogin = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user) {
    return { ok: false, message: "Email atau password salah." };
  }

  // Check password first
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { ok: false, message: "Email atau password salah." };
  }

  // Check if user is inactive
  if (!user.is_active) {
    // Check if siswa is pending activation
    if (user.role === ROLES.SISWA) {
      const [siswaRows] = await db.query(
        "SELECT status_pendaftaran FROM siswa WHERE user_id = ? LIMIT 1",
        [user.id]
      );
      if (siswaRows[0]?.status_pendaftaran === PENDAFTARAN_STATUS.PENDING) {
        return {
          ok: false,
          message: "Akun Anda masih menunggu aktivasi oleh admin cabang. Silakan hubungi admin untuk informasi lebih lanjut.",
        };
      }
    }
    return { ok: false, message: "Akun Anda tidak aktif. Silakan hubungi admin." };
  }

  return {
    ok: true,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      cabang_id: user.cabang_id,
    },
  };
};

module.exports = {
  findUserByEmail,
  validateLogin,
};
