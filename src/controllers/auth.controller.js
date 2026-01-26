const { getMenuByRole } = require("../config/menu");

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

module.exports = {
  login,
  logout,
  sessionInfo,
  menu,
};
