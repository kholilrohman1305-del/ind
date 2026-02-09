const feedbackService = require("../services/feedback.service");
const { ROLES } = require("../config/constants");

/**
 * Membuat feedback baru
 */
const createFeedback = async (req, res) => {
  try {
    const payload = req.body;
    payload.user_id = req.session.user?.id;

    if (!payload.user_id) {
      return res.status(401).json({ success: false, message: "Silakan login terlebih dahulu." });
    }

    const result = await feedbackService.createFeedback(payload);
    res.json({ success: true, data: result, message: "Feedback berhasil dikirim." });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

/**
 * Mendapatkan feedback pengguna
 */
const getUserFeedback = async (req, res) => {
  try {
    const userId = req.session.user?.id;
    if (!userId) {
      return res.status(401).json({ success: false, message: "Silakan login terlebih dahulu." });
    }
    const feedback = await feedbackService.getFeedbackByUser(userId);
    res.json({ success: true, data: feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Mendapatkan statistik feedback
 */
const getFeedbackStats = async (req, res) => {
  try {
    const role = req.session.user?.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user?.cabang_id : null;

    const filters = { ...req.query };
    if (cabangId) filters.cabang_id = cabangId;

    const stats = await feedbackService.getFeedbackStats(filters);
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * Mendapatkan feedback terbaru
 */
const getRecentFeedback = async (req, res) => {
  try {
    const role = req.session.user?.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user?.cabang_id : null;

    const limit = parseInt(req.query.limit) || 10;
    const search = req.query.q || null;
    const periode = req.query.periode || null;
    const feedback = await feedbackService.getRecentFeedback({ limit, cabangId, search, periode });
    res.json({ success: true, data: feedback });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  createFeedback,
  getUserFeedback,
  getFeedbackStats,
  getRecentFeedback
};
