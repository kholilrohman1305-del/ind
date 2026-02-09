const express = require("express");
const router = express.Router();
const forecastingController = require("../controllers/forecasting.controller");

router.get("/enrollment", forecastingController.getEnrollmentForecast);
router.get("/financial", forecastingController.getFinancialForecast);

module.exports = router;