const express = require("express");
const siswaController = require("../controllers/siswa.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["super_admin", "admin_cabang"]), siswaController.getAll);
router.post("/", requireAnyRole(["super_admin", "admin_cabang"]), siswaController.create);
router.post("/:id/renew", requireAnyRole(["super_admin", "admin_cabang"]), siswaController.renew);
router.put("/:id", requireAnyRole(["super_admin", "admin_cabang"]), siswaController.update);
router.delete("/:id", requireAnyRole(["super_admin", "admin_cabang"]), siswaController.remove);

module.exports = router;
