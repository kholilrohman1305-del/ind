const chatbotService = require("../services/chatbot.service");
const { ROLES } = require("../config/constants");

const query = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const { query } = req.body;

    const result = await chatbotService.processQuery(query, cabangId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = { query };