const pengeluaranService = require("../services/pengeluaran.service");

const list = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.query.cabang_id || null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const rows = await pengeluaranService.listPengeluaran({ cabangId, month, year });
    res.json(rows);
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || "Gagal memuat data." });
  }
};

const create = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.body.cabang_id || null;
    const result = await pengeluaranService.createPengeluaran({
      cabangId,
      kategori: req.body.kategori,
      deskripsi: req.body.deskripsi,
      nominal: req.body.nominal,
      tanggal: req.body.tanggal,
    });
    res.json(result);
  } catch (err) {
    res.status(400).json({ success: false, message: err.message || "Gagal menyimpan." });
  }
};

const remove = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId =
      role === "admin_cabang" ? req.session.user.cabang_id : req.query.cabang_id || null;
    await pengeluaranService.deletePengeluaran({ id: req.params.id, cabangId });
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
