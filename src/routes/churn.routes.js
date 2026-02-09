const express = require("express");
const router = express.Router();
const churnController = require("../controllers/churn.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

router.get(
  "/risks",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  churnController.getRisks
);

router.get(
  "/student/:id/details",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  churnController.getRiskDetails
);

module.exports = router;