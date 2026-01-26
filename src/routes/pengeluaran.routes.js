const express = require("express");
const pengeluaranController = require("../controllers/pengeluaran.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["super_admin", "admin_cabang"]), pengeluaranController.list);
router.post("/", requireAnyRole(["super_admin", "admin_cabang"]), pengeluaranController.create);
router.delete(
  "/:id",
  requireAnyRole(["super_admin", "admin_cabang"]),
  pengeluaranController.remove
);

module.exports = router;
