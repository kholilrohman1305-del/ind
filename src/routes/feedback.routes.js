const express = require("express");
const router = express.Router();
const feedbackController = require("../controllers/feedback.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { createFeedbackSchema } = require("../validators/feedback.validator");

// Rute untuk feedback siswa
router.post("/", requireAuth, validate(createFeedbackSchema), feedbackController.createFeedback);
router.get("/my-feedback", requireAuth, feedbackController.getUserFeedback);

// Rute untuk statistik dan analisis (mungkin hanya untuk admin)
router.get("/stats", requireAuth, feedbackController.getFeedbackStats);
router.get("/recent", requireAuth, feedbackController.getRecentFeedback);

module.exports = router;