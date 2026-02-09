const penggajianService = require("../services/penggajian.service");
const manajemenService = require("../services/manajemen.service");
const { ROLES } = require("../config/constants");
const { parsePagination, paginatedResponse } = require("../utils/pagination");

const listSetting = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
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
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
    const rows = await penggajianService.saveSetting(req.body, cabangId);
    res.json(rows);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Gagal menyimpan setting." });
  }
};

const deleteTarif = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
    const { nama_tarif, kategori_les } = req.query;
    await penggajianService.deleteTarif(nama_tarif, kategori_les, cabangId);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Gagal menghapus tarif." });
  }
};

const listTarifNames = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
    const rows = await penggajianService.listTarifNames(cabangId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat daftar tarif." });
  }
};

const listTarifForProgram = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
    const kategoriLes = req.query.kategori_les || null;
    const rows = await penggajianService.listTarifForProgram(cabangId, kategoriLes);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat tarif untuk program." });
  }
};

const listSlip = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
    const edukatorId = req.query.edukator_id || null;
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await penggajianService.listSlip({ cabangId, edukatorId, year, month }, { limit, offset });
    res.json(paginatedResponse(rows, total, { page, limit }));
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat slip." });
  }
};

const checkAnomalies = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
    
    const now = new Date();
    const year = Number(req.body.year || now.getFullYear());
    const month = Number(req.body.month || now.getMonth() + 1);

    const anomalies = await penggajianService.detectAnomalies(cabangId, year, month);
    
    res.json({ success: true, data: anomalies, message: `Pengecekan selesai. Ditemukan ${anomalies.length} anomali.` });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal mengecek anomali." });
  }
};

const createInfaq = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang wajib diisi." });
    }
    await penggajianService.createInfaq(req.body, cabangId, req.session.user.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Gagal menambah infaq." });
  }
};

const createInfaqMassal = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang wajib diisi." });
    }
    await penggajianService.createInfaqMassal(req.body, cabangId, req.session.user.id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Gagal menambah infaq massal." });
  }
};

const listInfaq = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
    const edukatorId = req.query.edukator_id || null;
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const rows = await penggajianService.listInfaq({ cabangId, edukatorId, year, month });
    return res.json(rows);
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Gagal memuat infaq." });
  }
};

const updateInfaq = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
    await penggajianService.updateInfaq(req.params.id, req.body, cabangId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Gagal memperbarui infaq." });
  }
};

const deleteInfaq = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
    await penggajianService.deleteInfaq(req.params.id, cabangId);
    return res.json({ success: true });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message || "Gagal menghapus infaq." });
  }
};

module.exports = {
  listSetting,
  saveSetting,
  deleteTarif,
  listTarifNames,
  listTarifForProgram,
  listSlip,
  createInfaq,
  createInfaqMassal,
  listInfaq,
  updateInfaq,
  deleteInfaq,
  listManajemen: async (req, res) => {
    try {
      const role = req.session.user.role;
      const cabangId =
        role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
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
        role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
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
        role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
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
  listTipeLes: async (req, res) => {
    try {
      const role = req.session.user.role;
      const cabangId =
        role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
      const rows = await penggajianService.listTipeLes(cabangId);
      res.json(rows);
    } catch (err) {
      res.status(500).json({ success: false, message: err.message || "Gagal memuat tipe les." });
    }
  },
  createTipeLes: async (req, res) => {
    try {
      const role = req.session.user.role;
      const cabangId =
        role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id || null;
      const result = await penggajianService.createTipeLes(req.body, cabangId);
      res.json({ success: true, data: result });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || "Gagal menambah tipe les." });
    }
  },
  deleteTipeLes: async (req, res) => {
    try {
      await penggajianService.deleteTipeLes(req.params.id);
      res.json({ success: true });
    } catch (err) {
      res.status(400).json({ success: false, message: err.message || "Gagal menghapus tipe les." });
    }
  },
  checkAnomalies,
};
