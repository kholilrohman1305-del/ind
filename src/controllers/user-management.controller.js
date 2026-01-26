const userManagementService = require("../services/user-management.service");

const listAdminCabang = async (req, res) => {
  try {
    const rows = await userManagementService.listAdminCabang();
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const resetPassword = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const password = (req.body.password || "password").trim();
    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password baru minimal 6 karakter.",
      });
    }
    await userManagementService.resetAdminPassword(userId, password);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateStatus = async (req, res) => {
  try {
    const userId = Number(req.params.id);
    const isActive = Boolean(req.body.is_active);
    await userManagementService.updateAdminStatus(userId, isActive);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listAdminCabang,
  resetPassword,
  updateStatus,
};
