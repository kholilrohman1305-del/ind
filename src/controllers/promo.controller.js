const promoService = require("../services/promo.service");

const list = async (req, res) => {
  try {
    const cabangId = req.session?.user?.cabang_id;
    const keyword = req.query.search ? String(req.query.search).trim() : "";
    const rows = await promoService.listPromo({ cabangId, keyword });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const cabangId = req.session?.user?.cabang_id;
    const result = await promoService.createPromo({
      cabangId,
      programId: Number(req.body.program_id),
      nama: req.body.nama,
      tipeDiskon: req.body.tipe_diskon,
      nilai: req.body.nilai,
      tanggalMulai: req.body.tanggal_mulai,
      tanggalSelesai: req.body.tanggal_selesai,
      isActive: req.body.is_active,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const cabangId = req.session?.user?.cabang_id;
    const result = await promoService.updatePromo({
      cabangId,
      id: Number(req.params.id),
      programId: Number(req.body.program_id),
      nama: req.body.nama,
      tipeDiskon: req.body.tipe_diskon,
      nilai: req.body.nilai,
      tanggalMulai: req.body.tanggal_mulai,
      tanggalSelesai: req.body.tanggal_selesai,
      isActive: req.body.is_active,
    });
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const cabangId = req.session?.user?.cabang_id;
    await promoService.deletePromo({ cabangId, id: Number(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  list,
  create,
  update,
  remove,
};
