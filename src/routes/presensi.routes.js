const express = require("express");
const presensiController = require("../controllers/presensi.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get(
  "/summary",
  requireAnyRole(["super_admin", "admin_cabang", "edukator"]),
  presensiController.listSummary
);
router.get(
  "/siswa",
  requireAnyRole(["siswa"]),
  presensiController.listSiswaHistory
);
router.get(
  "/edukator/:edukatorId",
  requireAnyRole(["super_admin", "admin_cabang", "edukator"]),
  presensiController.listDetail
);
router.post(
  "/absen/:jadwalId",
  requireAnyRole(["edukator"]),
  presensiController.absen
);

module.exports = router;
