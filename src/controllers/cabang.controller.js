const cabangService = require("../services/cabang.service");

const getAll = async (req, res) => {
  try {
    const rows = await cabangService.listCabang();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const result = await cabangService.createCabang(req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await cabangService.getCabangById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Cabang tidak ditemukan." });
    }
    await cabangService.updateCabang(id, req.body, existing);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await cabangService.getCabangById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Cabang tidak ditemukan." });
    }
    await cabangService.deleteCabang(id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAll,
  getRecommendations: async (req, res) => {
    try {
      const months = req.query.months ? Number(req.query.months) : 6;
      const k = req.query.k ? Number(req.query.k) : 3;
      const radiusKm = req.query.radius_km ? Number(req.query.radius_km) : 3;
      const rows = await cabangService.getCabangRecommendations({ months, k, radiusKm });
      return res.json({ success: true, data: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  create,
  update,
  remove,
};
