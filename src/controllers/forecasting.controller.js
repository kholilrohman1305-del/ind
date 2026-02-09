const dashboardService = require("../services/dashboard.service");
const { ROLES } = require("../config/constants");

const getEnrollmentForecast = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : (req.query.cabang_id || null);
    const data = await dashboardService.getEnrollmentForecast(cabangId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getFinancialForecast = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : (req.query.cabang_id || null);
    const data = await dashboardService.getFinancialForecast(cabangId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getEnrollmentForecast, getFinancialForecast };