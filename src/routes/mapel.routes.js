const express = require("express");
const mapelController = require("../controllers/mapel.controller");
const { requireAnyRole, requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["super_admin", "admin_cabang"]), mapelController.getAll);
router.post("/", requireRole("super_admin"), mapelController.create);
router.put("/:id", requireRole("super_admin"), mapelController.update);
router.delete("/:id", requireRole("super_admin"), mapelController.remove);

module.exports = router;
