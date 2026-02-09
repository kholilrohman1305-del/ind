const express = require("express");
const manajemenController = require("../controllers/manajemen.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), manajemenController.list);
router.post("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), manajemenController.create);
router.delete(
  "/:id",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  manajemenController.remove
);

module.exports = router;
