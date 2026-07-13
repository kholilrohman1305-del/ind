const bcrypt = require("bcryptjs");
const crypto = require("crypto");
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

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

const registerBiometricToken = async ({ userId, deviceInfo }) => {
  const token = crypto.randomBytes(48).toString("hex");
  await db.query(
    "INSERT INTO biometric_tokens (user_id, token_hash, device_info) VALUES (?, ?, ?)",
    [userId, hashToken(token), deviceInfo || null]
  );
  return token;
};

const validateBiometricToken = async (token) => {
  const [rows] = await db.query(
    `SELECT bt.id AS token_id, u.id, u.email, u.role, u.cabang_id, u.is_active
       FROM biometric_tokens bt
       JOIN users u ON u.id = bt.user_id
      WHERE bt.token_hash = ?
      LIMIT 1`,
    [hashToken(token)]
  );
  const row = rows[0];
  if (!row) {
    return { ok: false, message: "Login biometrik tidak dikenali. Silakan masuk dengan password." };
  }
  if (row.role !== ROLES.EDUKATOR) {
    return { ok: false, message: "Login biometrik hanya tersedia untuk akun edukator." };
  }
  if (!row.is_active) {
    return { ok: false, message: "Akun Anda tidak aktif. Silakan hubungi admin." };
  }

  await db.query("UPDATE biometric_tokens SET last_used_at = NOW() WHERE id = ?", [row.token_id]);

  return {
    ok: true,
    user: {
      id: row.id,
      email: row.email,
      role: row.role,
      cabang_id: row.cabang_id,
    },
  };
};

const removeBiometricToken = async ({ userId, token }) => {
  await db.query(
    "DELETE FROM biometric_tokens WHERE user_id = ? AND token_hash = ?",
    [userId, hashToken(token)]
  );
};

module.exports = {
  findUserByEmail,
  validateLogin,
  registerBiometricToken,
  validateBiometricToken,
  removeBiometricToken,
};
