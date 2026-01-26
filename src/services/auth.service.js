const bcrypt = require("bcryptjs");
const db = require("../db");

const findUserByEmail = async (email) => {
  const [rows] = await db.query(
    "SELECT id, email, password, role, cabang_id, is_active FROM users WHERE email = ? LIMIT 1",
    [email]
  );
  return rows[0] || null;
};

const validateLogin = async ({ email, password }) => {
  const user = await findUserByEmail(email);
  if (!user || !user.is_active) {
    return { ok: false, message: "Email atau password salah." };
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return { ok: false, message: "Email atau password salah." };
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
