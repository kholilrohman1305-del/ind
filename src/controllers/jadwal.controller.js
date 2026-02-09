const jadwalService = require("../services/jadwal.service");
const { ROLES, TIPE_LES } = require("../config/constants");
const { parsePagination, paginatedResponse } = require("../utils/pagination");

const list = async (req, res) => {
  try {
    const tipe = req.query.tipe === TIPE_LES.KELAS ? TIPE_LES.KELAS : TIPE_LES.PRIVAT;
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await jadwalService.listJadwal({
      tipe,
      role,
      cabangId,
      userId: req.session.user.id,
    }, { limit, offset });
    return res.json(paginatedResponse(rows, total, { page, limit }));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listPrivatSummary = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await jadwalService.listPrivatSummary(cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listPrivatSlots = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await jadwalService.listPrivatSlots(req.params.enrollmentId, cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};



const listKelasGroups = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await jadwalService.listKelasGroups(cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listKelasSiswaByPrograms = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const raw = req.query.program_ids || "";
    const programIds = raw
      .split(",")
      .map((item) => Number(item))
      .filter((item) => Number.isFinite(item));
    const rows = await jadwalService.listKelasSiswaByPrograms(programIds, cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
const listKelasSummary = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await jadwalService.listKelasSummary(cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listKelasSlots = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await jadwalService.listKelasSlots(req.params.kelasId, cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listPrivatSiswa = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await jadwalService.listPrivatSiswa(cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listKelasSiswa = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const rows = await jadwalService.listKelasSiswa(req.params.kelasId, cabangId);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const createPrivat = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const result = await jadwalService.createPrivatJadwal(req.body, cabangId);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const createKelas = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const result = await jadwalService.createKelasJadwal(req.body, cabangId);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const result = await jadwalService.updateJadwal(req.params.id, req.body, cabangId);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const removePrivat = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    await jadwalService.deletePrivatByEnrollment(req.params.enrollmentId, cabangId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const removeKelas = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    await jadwalService.deleteKelasByKelas(req.params.kelasId, cabangId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};


module.exports = {
  list,
  listPrivatSummary,
  listPrivatSlots,
  listKelasSummary,
  listKelasGroups,
  listKelasSlots,
  listPrivatSiswa,
  listKelasSiswa,
  listKelasSiswaByPrograms,
  createPrivat,
  createKelas,
  update,
  removePrivat,
  removeKelas,
};

