const { getMenuByRole } = require("../config/menu");
const { ROLES } = require("../config/constants");

const authService = require("../services/auth.service");

const login = async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ success: false, message: "Email dan password wajib diisi." });
    }

    const result = await authService.validateLogin({ email, password });
    if (!result.ok) {
      return res.status(401).json({ success: false, message: result.message });
    }

    req.session.user = result.user;
    return res.json({ success: true, user: result.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const logout = (req, res) => {
  if (!req.session) {
    return res.json({ success: true });
  }
  req.session.destroy(() => {
    res.json({ success: true });
  });
};

const sessionInfo = (req, res) => {
  if (req.session && req.session.user) {
    return res.json({ loggedIn: true, user: req.session.user });
  }
  return res.json({ loggedIn: false });
};

const menu = (req, res) => {
  const role = req.session.user.role;
  const allowed = getMenuByRole(role);
  return res.json({ success: true, role, menu: allowed });
};

const biometricRegister = async (req, res) => {
  try {
    const user = req.session.user;
    if (user.role !== ROLES.EDUKATOR) {
      return res.status(403).json({
        success: false,
        message: "Login biometrik hanya tersedia untuk akun edukator.",
      });
    }
    const deviceInfo = (req.body?.device_info || req.headers["user-agent"] || "").slice(0, 255);
    const token = await authService.registerBiometricToken({
      userId: user.id,
      deviceInfo,
    });
    return res.json({ success: true, token });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const biometricLogin = async (req, res) => {
  try {
    const { token } = req.body || {};
    const result = await authService.validateBiometricToken(token);
    if (!result.ok) {
      return res.status(401).json({ success: false, message: result.message });
    }
    req.session.user = result.user;
    return res.json({ success: true, user: result.user });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const biometricUnregister = async (req, res) => {
  try {
    const { token } = req.body || {};
    if (token) {
      await authService.removeBiometricToken({
        userId: req.session.user.id,
        token,
      });
    }
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  login,
  logout,
  sessionInfo,
  menu,
  biometricRegister,
  biometricLogin,
  biometricUnregister,
};
