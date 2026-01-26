const express = require("express");
const userManagementController = require("../controllers/user-management.controller");
const { requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get(
  "/admin-cabang",
  requireRole("super_admin"),
  userManagementController.listAdminCabang
);
router.patch(
  "/:id/reset-password",
  requireRole("super_admin"),
  userManagementController.resetPassword
);
router.patch(
  "/:id/status",
  requireRole("super_admin"),
  userManagementController.updateStatus
);

module.exports = router;
