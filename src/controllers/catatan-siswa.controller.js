const catatanSiswaService = require("../services/catatan-siswa.service");
const edukatorService = require("../services/edukator.service");
const { ROLES } = require("../config/constants");

const listStudents = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;

    let edukatorId;
    if (role === ROLES.EDUKATOR) {
      edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
      if (!edukatorId) {
        return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
      }
    } else {
      edukatorId = req.query.edukatorId;
      if (!edukatorId) {
        return res.status(400).json({ success: false, message: "edukatorId required for admin" });
      }
    }

    const data = await catatanSiswaService.listStudentsByEdukator(edukatorId, cabangId);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listNotes = async (req, res) => {
  try {
    const role = req.session.user.role;
    const siswaId = req.params.siswaId;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;

    let edukatorId = null;
    if (role === ROLES.EDUKATOR) {
      edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
      if (!edukatorId) {
        return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
      }
    }

    const filters = {
      kategori: req.query.kategori || null,
      startDate: req.query.startDate || null,
      endDate: req.query.endDate || null
    };

    const data = await catatanSiswaService.listNotesBySiswa(siswaId, edukatorId, cabangId, filters);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { siswa_id, tanggal, catatan } = req.body;

    if (!siswa_id || !tanggal || !catatan) {
      return res.status(400).json({ success: false, message: "siswa_id, tanggal, dan catatan wajib diisi" });
    }

    const edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
    if (!edukatorId) {
      return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
    }

    const result = await catatanSiswaService.createCatatan(req.body, edukatorId);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    const { catatan, kategori } = req.body;

    if (!catatan) {
      return res.status(400).json({ success: false, message: "catatan wajib diisi" });
    }

    const edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
    if (!edukatorId) {
      return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
    }

    await catatanSiswaService.updateCatatan(id, { catatan, kategori }, edukatorId);
    return res.json({ success: true });
  } catch (err) {
    if (err.message.includes("tidak memiliki akses")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    if (err.message.includes("tidak ditemukan")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;

    const edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
    if (!edukatorId) {
      return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
    }

    await catatanSiswaService.deleteCatatan(id, edukatorId);
    return res.json({ success: true });
  } catch (err) {
    if (err.message.includes("tidak memiliki akses")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    if (err.message.includes("tidak ditemukan")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listStudents,
  listNotes,
  create,
  update,
  remove,
};
