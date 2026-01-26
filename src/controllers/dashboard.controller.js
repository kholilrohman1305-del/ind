const dashboardService = require("../services/dashboard.service");

const summary = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : null;
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const data = await dashboardService.getSummary(cabangId, { month, year });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const summarySiswa = async (req, res) => {
  try {
    const data = await dashboardService.getSiswaSummary(req.session.user.id);
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const performanceCabang = async (req, res) => {
  try {
    const month = req.query.month ? Number(req.query.month) : null;
    const year = req.query.year ? Number(req.query.year) : null;
    const data = await dashboardService.getCabangPerformance({ month, year });
    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  summary,
  summarySiswa,
  performanceCabang,
  summaryEdukator: async (req, res) => {
    try {
      const data = await dashboardService.getEdukatorSummary(req.session.user.id);
      return res.json({ success: true, data });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
};
