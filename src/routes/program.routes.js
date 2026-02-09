const express = require("express");
const programController = require("../controllers/program.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), programController.getAll);
router.post("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), programController.create);
router.put("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), programController.update);
router.delete("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), programController.remove);

module.exports = router;
