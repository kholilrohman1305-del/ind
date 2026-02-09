const express = require("express");
const penggajianController = require("../controllers/penggajian.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { saveSettingSchema, deleteTarifQuerySchema, createInfaqSchema, createInfaqMassalSchema, updateInfaqSchema, checkAnomaliesSchema, updateManajemenSalarySchema, assignManajemenSchema, createTipeLesSchema } = require("../validators/penggajian.validator");

const router = express.Router();

router.get(
  "/setting",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.listSetting
);
router.post(
  "/setting",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(saveSettingSchema),
  penggajianController.saveSetting
);
router.delete(
  "/setting/tarif",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(deleteTarifQuerySchema),
  penggajianController.deleteTarif
);
router.get(
  "/setting/names",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.listTarifNames
);
router.get(
  "/tarif-for-program",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.listTarifForProgram
);
router.get(
  "/slip",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.listSlip
);
router.post(
  "/infaq",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(createInfaqSchema),
  penggajianController.createInfaq
);
router.post(
  "/infaq/massal",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(createInfaqMassalSchema),
  penggajianController.createInfaqMassal
);
router.get(
  "/infaq",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.listInfaq
);
router.put(
  "/infaq/:id",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(updateInfaqSchema),
  penggajianController.updateInfaq
);
router.delete(
  "/infaq/:id",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.deleteInfaq
);
router.get(
  "/manajemen",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.listManajemen
);
router.post(
  "/manajemen",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(updateManajemenSalarySchema),
  penggajianController.updateManajemenSalary
);
router.post(
  "/assign-manajemen",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(assignManajemenSchema),
  penggajianController.assignManajemen
);

// Tipe Les API
router.get(
  "/tipe-les",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.listTipeLes
);
router.post(
  "/tipe-les",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(createTipeLesSchema),
  penggajianController.createTipeLes
);
router.delete(
  "/tipe-les/:id",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  penggajianController.deleteTipeLes
);

router.post(
  "/anomalies/check",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  validate(checkAnomaliesSchema),
  penggajianController.checkAnomalies
);

module.exports = router;
