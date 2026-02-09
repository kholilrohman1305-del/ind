const express = require("express");
const router = express.Router();
const rekomendasiController = require("../controllers/rekomendasi.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

// Endpoint untuk mendapatkan rekomendasi edukator
// Akses: Super Admin & Admin Cabang
router.get(
  "/edukator",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  rekomendasiController.getEdukatorRecommendations
);

module.exports = router;