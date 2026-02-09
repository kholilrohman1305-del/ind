const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get(
  "/summary",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  dashboardController.summary
);
router.get(
  "/performance",
  requireAnyRole([ROLES.SUPER_ADMIN]),
  dashboardController.performanceCabang
);
router.get(
  "/cabang-analytics",
  requireAnyRole([ROLES.SUPER_ADMIN]),
  dashboardController.cabangAnalytics
);
router.get(
  "/siswa",
  requireAnyRole([ROLES.SISWA]),
  dashboardController.summarySiswa
);
router.get(
  "/edukator",
  requireAnyRole([ROLES.EDUKATOR]),
  dashboardController.summaryEdukator
);

module.exports = router;
