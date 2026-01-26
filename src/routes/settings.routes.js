const express = require("express");
const settingsController = require("../controllers/settings.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get(
  "/cabang",
  requireAnyRole(["admin_cabang", "super_admin"]),
  settingsController.getCabangSetting
);
router.patch(
  "/cabang",
  requireAnyRole(["admin_cabang", "super_admin"]),
  settingsController.updateCabangSetting
);

module.exports = router;
