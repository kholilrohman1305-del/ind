const edukatorService = require("../services/edukator.service");
const { ROLES } = require("../config/constants");
const { parsePagination, paginatedResponse } = require("../utils/pagination");

const getAll = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await edukatorService.listEdukator(cabangId, { limit, offset });
    return res.json(paginatedResponse(rows, total, { page, limit }));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_utama_id;
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
    if (role === ROLES.ADMIN_CABANG && existing.cabang_utama_id !== req.session.user.cabang_id) {
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
    if (role === ROLES.ADMIN_CABANG && existing.cabang_utama_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    await edukatorService.deleteEdukator(id, existing.user_id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getRekapPresensi = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;

    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    let edukatorId = req.query.edukatorId;

    if (role === ROLES.EDUKATOR) {
      edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
      if (!edukatorId) {
        return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
      }
    } else if (!edukatorId) {
      return res.status(400).json({ success: false, message: "edukatorId required for admin" });
    }

    const data = await edukatorService.getRekapPresensi(edukatorId, cabangId, year, month);
    const edukator = await edukatorService.getEdukatorById(edukatorId);

    return res.json({
      success: true,
      data: {
        edukator_id: edukatorId,
        edukator_nama: edukator ? edukator.nama : "",
        bulan: `${year}-${month.toString().padStart(2, "0")}`,
        ...data
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const profile = await edukatorService.getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ success: false, message: "Profil edukator tidak ditemukan." });
    }
    return res.json({ success: true, data: profile });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const updated = await edukatorService.updateProfileByUserId(userId, req.body);
    if (!updated) {
      return res.status(404).json({ success: false, message: "Profil edukator tidak ditemukan." });
    }
    if (req.body.email) {
      req.session.user.email = req.body.email;
    }
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getRincianGaji = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;

    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);

    let edukatorId = req.query.edukatorId;

    if (role === ROLES.EDUKATOR) {
      edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
      if (!edukatorId) {
        return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
      }
    } else if (!edukatorId) {
      return res.status(400).json({ success: false, message: "edukatorId required for admin" });
    }

    const data = await edukatorService.getRincianGaji(edukatorId, cabangId, year, month);

    return res.json({
      success: true,
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getTopHistory = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;

    const now = new Date();
    const year = parseInt(req.query.year) || now.getFullYear();
    const month = parseInt(req.query.month) || (now.getMonth() + 1);
    const limit = parseInt(req.query.limit) || 5;

    const rows = await edukatorService.getTopHistory(cabangId, year, month, limit);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
  getRekapPresensi,
  getRincianGaji,
  getTopHistory,
  getProfile,
  updateProfile,
};
