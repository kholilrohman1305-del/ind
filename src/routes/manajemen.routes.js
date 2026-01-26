const express = require("express");
const manajemenController = require("../controllers/manajemen.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["super_admin", "admin_cabang"]), manajemenController.list);
router.post("/", requireAnyRole(["super_admin", "admin_cabang"]), manajemenController.create);
router.delete(
  "/:id",
  requireAnyRole(["super_admin", "admin_cabang"]),
  manajemenController.remove
);

module.exports = router;
