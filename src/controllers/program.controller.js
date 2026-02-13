const programService = require("../services/program.service");
const { ROLES } = require("../config/constants");
const { deleteFile } = require("../middlewares/upload.middleware");

const getAll = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await programService.listProgram(cabangId);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang wajib diisi." });
    }
    const gambar = req.file?.savedPath || null;
    const payload = { ...req.body, cabang_id: cabangId, gambar };
    const result = await programService.createProgram(payload);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const existing = await programService.getProgramById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Program tidak ditemukan." });
    }
    if (role === ROLES.ADMIN_CABANG && existing.cabang_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const gambar = req.file?.savedPath || undefined;
    if (gambar && existing.gambar) {
      deleteFile(existing.gambar);
    }
    const result = await programService.updateProgram(id, { ...req.body, gambar }, existing);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const existing = await programService.getProgramById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Program tidak ditemukan." });
    }
    if (role === ROLES.ADMIN_CABANG && existing.cabang_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    await programService.deleteProgram(id);
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
