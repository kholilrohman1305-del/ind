const express = require("express");
const dashboardController = require("../controllers/dashboard.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get(
  "/summary",
  requireAnyRole(["super_admin", "admin_cabang"]),
  dashboardController.summary
);
router.get(
  "/performance",
  requireAnyRole(["super_admin"]),
  dashboardController.performanceCabang
);
router.get(
  "/siswa",
  requireAnyRole(["siswa"]),
  dashboardController.summarySiswa
);
router.get(
  "/edukator",
  requireAnyRole(["edukator"]),
  dashboardController.summaryEdukator
);

module.exports = router;
