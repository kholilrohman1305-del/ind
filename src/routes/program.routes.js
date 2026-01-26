const express = require("express");
const programController = require("../controllers/program.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["super_admin", "admin_cabang"]), programController.getAll);
router.post("/", requireAnyRole(["super_admin", "admin_cabang"]), programController.create);
router.put("/:id", requireAnyRole(["super_admin", "admin_cabang"]), programController.update);
router.delete("/:id", requireAnyRole(["super_admin", "admin_cabang"]), programController.remove);

module.exports = router;
