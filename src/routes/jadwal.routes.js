const express = require("express");
const jadwalController = require("../controllers/jadwal.controller");
const { requireAuth, requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { createPrivatJadwalSchema, createKelasJadwalSchema, updateJadwalSchema, enrollmentIdParamSchema, kelasIdParamSchema } = require("../validators/jadwal.validator");

const router = express.Router();

router.get("/", requireAuth, jadwalController.list);
router.get(
  "/privat/summary",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listPrivatSummary
);
router.get(
  "/privat/:enrollmentId/slots",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listPrivatSlots
);
router.get(
  "/kelas/summary",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listKelasSummary
);
router.get(
  "/kelas/groups",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listKelasGroups
);
router.get(
  "/kelas/:kelasId/slots",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listKelasSlots
);
router.get(
  "/privat/siswa",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listPrivatSiswa
);
router.get(
  "/kelas/programs/siswa",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listKelasSiswaByPrograms
);
router.get(
  "/kelas/:kelasId/siswa",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  jadwalController.listKelasSiswa
);
router.post(
  "/privat",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(createPrivatJadwalSchema),
  jadwalController.createPrivat
);
router.post(
  "/kelas",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(createKelasJadwalSchema),
  jadwalController.createKelas
);
router.delete(
  "/privat/enrollment/:enrollmentId",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(enrollmentIdParamSchema),
  jadwalController.removePrivat
);
router.delete(
  "/kelas/:kelasId",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(kelasIdParamSchema),
  jadwalController.removeKelas
);
router.patch(
  "/:id",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(updateJadwalSchema),
  jadwalController.update
);

module.exports = router;
