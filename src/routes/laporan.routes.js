const express = require("express");
const router = express.Router();
const laporanController = require("../controllers/laporan.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

router.get(
  "/keuangan",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  laporanController.getKeuangan
);
router.get(
  "/lanjutan",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  laporanController.getLanjutan
);
router.get(
  "/detail",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  laporanController.getDetail
);

module.exports = router;