const express = require("express");
const edukatorController = require("../controllers/edukator.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { createEdukatorSchema, updateEdukatorSchema, updateProfileEdukatorSchema } = require("../validators/edukator.validator");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), edukatorController.getAll);
router.get("/top-history", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), edukatorController.getTopHistory);
router.get("/profile", requireAnyRole([ROLES.EDUKATOR]), edukatorController.getProfile);
router.post("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), validate(createEdukatorSchema), edukatorController.create);
router.put("/profile", requireAnyRole([ROLES.EDUKATOR]), validate(updateProfileEdukatorSchema), edukatorController.updateProfile);
router.put("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), validate(updateEdukatorSchema), edukatorController.update);
router.delete("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), edukatorController.remove);
router.get("/rekap-presensi", requireAnyRole([ROLES.EDUKATOR, ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), edukatorController.getRekapPresensi);
router.get("/rincian-gaji", requireAnyRole([ROLES.EDUKATOR, ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), edukatorController.getRincianGaji);

module.exports = router;
