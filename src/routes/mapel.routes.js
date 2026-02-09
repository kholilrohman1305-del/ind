const express = require("express");
const mapelController = require("../controllers/mapel.controller");
const { requireAnyRole, requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), mapelController.getAll);
router.post("/", requireRole(ROLES.SUPER_ADMIN), mapelController.create);
router.put("/:id", requireRole(ROLES.SUPER_ADMIN), mapelController.update);
router.delete("/:id", requireRole(ROLES.SUPER_ADMIN), mapelController.remove);

module.exports = router;
