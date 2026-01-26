const mapelService = require("../services/mapel.service");

const getAll = async (req, res) => {
  try {
    const rows = await mapelService.listMapel();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const result = await mapelService.createMapel(req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await mapelService.getMapelById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Mapel tidak ditemukan." });
    }
    await mapelService.updateMapel(id, req.body, existing);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await mapelService.getMapelById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Mapel tidak ditemukan." });
    }
    await mapelService.deleteMapel(id);
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
