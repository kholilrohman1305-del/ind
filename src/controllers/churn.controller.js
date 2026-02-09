const churnService = require("../services/churn.service");
const { ROLES } = require("../config/constants");

const getRisks = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.query.cabang_id || null;
    
    const data = await churnService.getStudentRisks(cabangId);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getRiskDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const data = await churnService.getStudentRiskDetails(id);
    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { getRisks, getRiskDetails };