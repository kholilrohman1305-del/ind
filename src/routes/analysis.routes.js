const express = require("express");
const router = express.Router();
const analysisController = require("../controllers/analysis.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

// Existing routes
router.get("/bundling", requireAuth, analysisController.getBundlingRules);

// New route for sentiment data
router.get("/sentiment-data", requireAuth, analysisController.getSentimentData);

module.exports = router;