const settingsService = require("../services/settings.service");

const getCabangSetting = async (req, res) => {
  try {
    const user = req.session?.user;
    const role = user?.role;
    const cabangId =
      role === "super_admin"
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
      role === "super_admin"
        ? Number(req.body.cabang_id || req.query.cabang_id || user?.cabang_id)
        : user?.cabang_id;

    if (!cabangId) {
      return res
        .status(400)
        .json({ success: false, message: "Cabang tidak ditemukan." });
    }

    const payload = { ...(req.body || {}) };
    if (role !== "super_admin") {
      delete payload.kode;
    }
    const data = await settingsService.updateCabangProfile(cabangId, payload, {
      allowKode: role === "super_admin",
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
