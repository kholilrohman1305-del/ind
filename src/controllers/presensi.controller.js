const presensiService = require("../services/presensi.service");
const { ROLES } = require("../config/constants");
const { parsePagination, paginatedResponse } = require("../utils/pagination");

const parseDateParam = (value) => {
  if (!value || typeof value !== "string") return null;
  const sanitized = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(sanitized)) return null;
  return sanitized;
};

const normalizeDateRange = (start, end) => {
  if (!start || !end) return { startDate: start, endDate: end };
  const startTime = new Date(start).getTime();
  const endTime = new Date(end).getTime();
  if (Number.isNaN(startTime) || Number.isNaN(endTime)) {
    return { startDate: start, endDate: end };
  }
  if (startTime <= endTime) {
    return { startDate: start, endDate: end };
  }
  return { startDate: end, endDate: start };
};

const resolveDateRange = (req) => {
  const startDate = parseDateParam(req.query.start_date);
  const endDate = parseDateParam(req.query.end_date);
  const normalized = normalizeDateRange(startDate, endDate);
  if (normalized.startDate && normalized.endDate) {
    return normalized;
  }
  return { startDate: null, endDate: null };
};

const listSummary = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const monthParam = req.query.month;
    const [yearStr, monthStr] = monthParam ? monthParam.split("-") : [];
    const now = new Date();
    const year = Number(yearStr) || now.getFullYear();
    const month = Number(monthStr) || now.getMonth() + 1;
    const search = req.query.search ? String(req.query.search).trim() : "";
    let edukatorId = null;
    if (role === ROLES.EDUKATOR) {
      edukatorId = await presensiService.getEdukatorIdByUserId(req.session.user.id);
    }
    const { startDate, endDate } = resolveDateRange(req);
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await presensiService.listPresensiSummary({
      cabangId,
      search,
      year,
      month,
      edukatorId,
      startDate,
      endDate,
    }, { limit, offset });
    return res.json(paginatedResponse(rows, total, { page, limit }));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listDetail = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const monthParam = req.query.month;
    const [yearStr, monthStr] = monthParam ? monthParam.split("-") : [];
    const now = new Date();
    const year = Number(yearStr) || now.getFullYear();
    const month = Number(monthStr) || now.getMonth() + 1;
    const edukatorId = req.params.edukatorId;
    if (role === ROLES.EDUKATOR) {
      const ownId = await presensiService.getEdukatorIdByUserId(req.session.user.id);
      if (String(ownId) !== String(edukatorId)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }
    const { startDate, endDate } = resolveDateRange(req);
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await presensiService.listPresensiDetail({
      edukatorId,
      cabangId,
      year,
      month,
      startDate,
      endDate,
    }, { limit, offset });
    return res.json(paginatedResponse(rows, total, { page, limit }));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const absen = async (req, res) => {
  try {
    const role = req.session.user.role;
    if (role !== ROLES.EDUKATOR) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const latitude = req.body?.latitude ?? null;
    const longitude = req.body?.longitude ?? null;
    const materi = req.body?.materi ?? null;
    // For kelas: array of { siswaId, status } where status is 'hadir'/'tidak_hadir'/'izin'
    const kehadiran = req.body?.kehadiran ?? null;

    if (!materi || String(materi).trim() === "") {
      return res.status(400).json({ success: false, message: "Materi wajib diisi." });
    }
    const result = await presensiService.createPresensiFromJadwal(
      req.params.jadwalId,
      req.session.user.id,
      { latitude, longitude, materi, kehadiran }
    );
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const getKelasSiswa = async (req, res) => {
  try {
    const role = req.session.user.role;
    if (role !== ROLES.EDUKATOR) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const jadwalId = req.params.jadwalId;
    const rows = await presensiService.getKelasSiswaByJadwal(jadwalId, req.session.user.id);
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const listSiswaHistory = async (req, res) => {
  try {
    const role = req.session.user.role;
    if (role !== ROLES.SISWA) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const rows = await presensiService.listSiswaHistory({ userId: req.session.user.id });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listSiswaHistoryByProgram = async (req, res) => {
  try {
    const role = req.session.user.role;
    if (role !== ROLES.SISWA) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const programId = Number(req.params.programId);
    if (!programId) {
      return res.status(400).json({ success: false, message: "Program tidak valid." });
    }
    const rows = await presensiService.listSiswaHistoryByProgram({
      userId: req.session.user.id,
      programId,
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listSummary,
  listDetail,
  listSiswaHistory,
  listSiswaHistoryByProgram,
  absen,
  getKelasSiswa,
};
