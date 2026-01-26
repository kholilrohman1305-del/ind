const penggajianService = require("../services/penggajian.service");
const manajemenService = require("../services/manajemen.service");

const listSetting = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.query.cabang_id || null;
    const rows = await penggajianService.listSetting(cabangId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat setting gaji." });
  }
};

const saveSetting = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.body.cabang_id || null;
    const rows = await penggajianService.saveSetting(req.body, cabangId);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Gagal menyimpan setting." });
  }
};

const listSlip = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.query.cabang_id || null;
    const edukatorId = req.query.edukator_id || null;
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const rows = await penggajianService.listSlip({ cabangId, edukatorId, year, month });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat slip." });
  }
};

module.exports = {
  listSetting,
  saveSetting,
  listSlip,
  listManajemen: async (req, res) => {
    try {
      const role = req.session.user.role;
      const cabangId =
        role === "admin_cabang" ? req.session.user.cabang_id : req.query.cabang_id || null;
      const rows = await manajemenService.listManajemen(cabangId);
      res.json(rows);
    } catch (err) {
      res
        .status(500)
        .json({ success: false, message: err.message || "Gagal memuat manajemen." });
    }
  },
  updateManajemenSalary: async (req, res) => {
    try {
      const role = req.session.user.role;
      const cabangId =
        role === "admin_cabang" ? req.session.user.cabang_id : req.body.cabang_id || null;
      await manajemenService.updateManajemenSalary({
        id: req.body.id,
        gajiTambahan: req.body.gaji_tambahan,
        cabangId,
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || "Gagal menyimpan." });
    }
  },
  assignManajemen: async (req, res) => {
    try {
      const role = req.session.user.role;
      const cabangId =
        role === "admin_cabang" ? req.session.user.cabang_id : req.body.cabang_id || null;
      await manajemenService.assignManajemenToEdukator({
        edukatorId: req.body.edukator_id,
        manajemenId: req.body.manajemen_id || null,
        cabangId,
      });
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || "Gagal menyimpan." });
    }
  },
};
