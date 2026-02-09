const express = require("express");
const pengeluaranController = require("../controllers/pengeluaran.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), pengeluaranController.list);
router.post("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), pengeluaranController.create);
router.delete(
  "/:id",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  pengeluaranController.remove
);

module.exports = router;
