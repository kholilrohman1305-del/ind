const express = require("express");
const edukatorController = require("../controllers/edukator.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["super_admin", "admin_cabang"]), edukatorController.getAll);
router.post("/", requireAnyRole(["super_admin", "admin_cabang"]), edukatorController.create);
router.put("/:id", requireAnyRole(["super_admin", "admin_cabang"]), edukatorController.update);
router.delete("/:id", requireAnyRole(["super_admin", "admin_cabang"]), edukatorController.remove);

module.exports = router;
