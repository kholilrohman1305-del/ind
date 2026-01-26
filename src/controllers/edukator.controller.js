const edukatorService = require("../services/edukator.service");

const getAll = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : null;
    const rows = await edukatorService.listEdukator(cabangId);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : req.body.cabang_utama_id;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang wajib diisi." });
    }
    const mapelIds = req.body.mapel_ids;
    if (!mapelIds || (Array.isArray(mapelIds) && mapelIds.length === 0)) {
      return res.status(400).json({ success: false, message: "Mapel wajib dipilih." });
    }
    const payload = { ...req.body, cabang_utama_id: cabangId };
    const result = await edukatorService.createEdukator(payload);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const existing = await edukatorService.getEdukatorById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
    }
    if (role === "admin_cabang" && existing.cabang_utama_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    await edukatorService.updateEdukator(id, req.body, existing);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const existing = await edukatorService.getEdukatorById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
    }
    if (role === "admin_cabang" && existing.cabang_utama_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    await edukatorService.deleteEdukator(id, existing.user_id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
};
