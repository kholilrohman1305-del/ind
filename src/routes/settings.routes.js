const express = require("express");
const settingsController = require("../controllers/settings.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get(
  "/cabang",
  requireAnyRole([ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]),
  settingsController.getCabangSetting
);
router.patch(
  "/cabang",
  requireAnyRole([ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]),
  settingsController.updateCabangSetting
);

module.exports = router;
