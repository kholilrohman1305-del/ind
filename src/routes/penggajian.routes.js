const express = require("express");
const penggajianController = require("../controllers/penggajian.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get(
  "/setting",
  requireAnyRole(["super_admin", "admin_cabang"]),
  penggajianController.listSetting
);
router.post(
  "/setting",
  requireAnyRole(["super_admin", "admin_cabang"]),
  penggajianController.saveSetting
);
router.get(
  "/slip",
  requireAnyRole(["super_admin", "admin_cabang"]),
  penggajianController.listSlip
);
router.get(
  "/manajemen",
  requireAnyRole(["super_admin", "admin_cabang"]),
  penggajianController.listManajemen
);
router.post(
  "/manajemen",
  requireAnyRole(["super_admin", "admin_cabang"]),
  penggajianController.updateManajemenSalary
);
router.post(
  "/assign-manajemen",
  requireAnyRole(["super_admin", "admin_cabang"]),
  penggajianController.assignManajemen
);

module.exports = router;
