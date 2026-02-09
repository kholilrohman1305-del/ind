const laporanService = require("../services/laporan.service");
const { ROLES } = require("../config/constants");

const getKeuangan = async (req, res) => {
  try {
    const { mode, year, month } = req.query;
    const cabangId = req.session.user.role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : (req.query.cabang_id || null);
    
    let data;
    if (mode === 'year') {
      data = await laporanService.getKeuanganTahunan({ cabangId, year });
    } else {
      data = await laporanService.getKeuanganBulanan({ cabangId, year, month });
    }
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getLanjutan = async (req, res) => {
  try {
    const { year, month } = req.query;
    const cabangId = req.session.user.role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : (req.query.cabang_id || null);
    const data = await laporanService.getLanjutanSummary({ cabangId, year, month });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getDetail = async (req, res) => {
  try {
    const { year, month, category } = req.query;
    const cabangId = req.session.user.role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : (req.query.cabang_id || null);
    const data = await laporanService.getDetailPengeluaran({ cabangId, year, month, category });
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getKeuangan, getLanjutan, getDetail };