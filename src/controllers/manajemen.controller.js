const manajemenService = require("../services/manajemen.service");

const list = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.query.cabang_id || null;
    const rows = await manajemenService.listManajemen(cabangId);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat manajemen." });
  }
};

const create = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.body.cabang_id || null;
    const result = await manajemenService.createManajemen({
      nama: req.body.nama,
      cabangId,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Gagal membuat manajemen." });
  }
};

const remove = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.query.cabang_id || null;
    await manajemenService.deleteManajemen({ id: req.params.id, cabangId });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Gagal menghapus." });
  }
};

module.exports = {
  list,
  create,
  remove,
};
