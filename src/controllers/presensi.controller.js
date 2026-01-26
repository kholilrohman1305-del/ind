const presensiService = require("../services/presensi.service");

const listSummary = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : null;
    const monthParam = req.query.month;
    const [yearStr, monthStr] = monthParam ? monthParam.split("-") : [];
    const now = new Date();
    const year = Number(yearStr) || now.getFullYear();
    const month = Number(monthStr) || now.getMonth() + 1;
    const search = req.query.search ? String(req.query.search).trim() : "";
    let edukatorId = null;
    if (role === "edukator") {
      edukatorId = await presensiService.getEdukatorIdByUserId(req.session.user.id);
    }
    const rows = await presensiService.listPresensiSummary({
      cabangId,
      search,
      year,
      month,
      edukatorId,
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const listDetail = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : null;
    const monthParam = req.query.month;
    const [yearStr, monthStr] = monthParam ? monthParam.split("-") : [];
    const now = new Date();
    const year = Number(yearStr) || now.getFullYear();
    const month = Number(monthStr) || now.getMonth() + 1;
    const edukatorId = req.params.edukatorId;
    if (role === "edukator") {
      const ownId = await presensiService.getEdukatorIdByUserId(req.session.user.id);
      if (String(ownId) !== String(edukatorId)) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    }
    const rows = await presensiService.listPresensiDetail({
      edukatorId,
      cabangId,
      year,
      month,
    });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const absen = async (req, res) => {
  try {
    const role = req.session.user.role;
    if (role !== "edukator") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const latitude = req.body?.latitude ?? null;
    const longitude = req.body?.longitude ?? null;
    const materi = req.body?.materi ?? null;
    if (!materi || String(materi).trim() === "") {
      return res.status(400).json({ success: false, message: "Materi wajib diisi." });
    }
    const result = await presensiService.createPresensiFromJadwal(
      req.params.jadwalId,
      req.session.user.id,
      { latitude, longitude, materi }
    );
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

const listSiswaHistory = async (req, res) => {
  try {
    const role = req.session.user.role;
    if (role !== "siswa") {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const rows = await presensiService.listSiswaHistory({ userId: req.session.user.id });
    return res.json({ success: true, data: rows });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  listSummary,
  listDetail,
  listSiswaHistory,
  absen,
};
