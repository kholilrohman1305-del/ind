const settingsService = require("../services/settings.service");
const { ROLES } = require("../config/constants");

const getCabangSetting = async (req, res) => {
  try {
    const user = req.session?.user;
    const role = user?.role;
    const cabangId =
      role === ROLES.SUPER_ADMIN
        ? Number(req.query.cabang_id || user?.cabang_id)
        : user?.cabang_id;

    if (!cabangId) {
      return res
        .status(400)
        .json({ success: false, message: "Cabang tidak ditemukan." });
    }

    const data = await settingsService.getCabangProfile(cabangId);
    if (!data) {
      return res
        .status(404)
        .json({ success: false, message: "Data cabang tidak ditemukan." });
    }
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateCabangSetting = async (req, res) => {
  try {
    const user = req.session?.user;
    const role = user?.role;
    const cabangId =
      role === ROLES.SUPER_ADMIN
        ? Number(req.body.cabang_id || req.query.cabang_id || user?.cabang_id)
        : user?.cabang_id;

    if (!cabangId) {
      return res
        .status(400)
        .json({ success: false, message: "Cabang tidak ditemukan." });
    }

    const payload = { ...(req.body || {}) };
    if (role !== ROLES.SUPER_ADMIN) {
      delete payload.kode;
    }
    const data = await settingsService.updateCabangProfile(cabangId, payload, {
      allowKode: role === ROLES.SUPER_ADMIN,
    });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getCabangSetting,
  updateCabangSetting,
};
