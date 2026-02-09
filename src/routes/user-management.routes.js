const express = require("express");
const userManagementController = require("../controllers/user-management.controller");
const { requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get(
  "/admin-cabang",
  requireRole(ROLES.SUPER_ADMIN),
  userManagementController.listAdminCabang
);
router.patch(
  "/:id/reset-password",
  requireRole(ROLES.SUPER_ADMIN),
  userManagementController.resetPassword
);
router.patch(
  "/:id/status",
  requireRole(ROLES.SUPER_ADMIN),
  userManagementController.updateStatus
);

module.exports = router;
