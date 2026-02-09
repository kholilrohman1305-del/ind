const express = require("express");
const presensiController = require("../controllers/presensi.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { absenSchema } = require("../validators/presensi.validator");

const router = express.Router();

router.get(
  "/summary",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG, ROLES.EDUKATOR]),
  presensiController.listSummary
);
router.get(
  "/siswa",
  requireAnyRole([ROLES.SISWA]),
  presensiController.listSiswaHistory
);
router.get(
  "/siswa/program/:programId",
  requireAnyRole([ROLES.SISWA]),
  presensiController.listSiswaHistoryByProgram
);
router.get(
  "/edukator/:edukatorId",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG, ROLES.EDUKATOR]),
  presensiController.listDetail
);
router.post(
  "/absen/:jadwalId",
  requireAnyRole([ROLES.EDUKATOR]),
  validate(absenSchema),
  presensiController.absen
);

// Get students list for a class schedule (kelas)
router.get(
  "/kelas-siswa/:jadwalId",
  requireAnyRole([ROLES.EDUKATOR]),
  presensiController.getKelasSiswa
);

module.exports = router;
