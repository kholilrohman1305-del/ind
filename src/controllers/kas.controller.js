const kasService = require("../services/kas.service");

const summary = async (req, res) => {
  try {
    const user = req.session?.user;
    const cabangId = user?.cabang_id;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang tidak ditemukan." });
    }
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const data = await kasService.getSummary({ cabangId, year, month });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const entries = async (req, res) => {
  try {
    const user = req.session?.user;
    const cabangId = user?.cabang_id;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang tidak ditemukan." });
    }
    const year = req.query.year ? Number(req.query.year) : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const rows = await kasService.listEntries({ cabangId, year, month });
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const setSaldo = async (req, res) => {
  try {
    const user = req.session?.user;
    const cabangId = user?.cabang_id;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang tidak ditemukan." });
    }
    const year = Number(req.body.year);
    const month = Number(req.body.month);
    const nominal = Number(req.body.nominal || 0);
    if (!year || !month) {
      return res.status(400).json({ success: false, message: "Periode wajib diisi." });
    }
    const data = await kasService.upsertSaldoAwal({ cabangId, year, month, nominal });
    res.json({ success: true, data });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  summary,
  entries,
  setSaldo,
};
