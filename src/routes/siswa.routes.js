const express = require("express");
const siswaController = require("../controllers/siswa.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { createSiswaSchema, updateSiswaSchema, renewSiswaSchema, updateProfileSiswaSchema } = require("../validators/siswa.validator");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), siswaController.getAll);
router.get("/profile", requireAnyRole([ROLES.SISWA]), siswaController.getProfile);
router.put("/profile", requireAnyRole([ROLES.SISWA]), validate(updateProfileSiswaSchema), siswaController.updateProfile);
router.get("/programs", requireAnyRole([ROLES.SISWA]), siswaController.getPrograms);
router.get("/tagihan-summary", requireAnyRole([ROLES.SISWA]), siswaController.getTagihanSummary);
router.get("/rekomendasi-programs", requireAnyRole([ROLES.SISWA]), siswaController.getRecommendedPrograms);
router.post("/renew-program", requireAnyRole([ROLES.SISWA]), siswaController.renewProgramSelf);
router.get("/edukators", requireAnyRole([ROLES.SISWA]), siswaController.getEdukators);
router.post("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), validate(createSiswaSchema), siswaController.create);
router.post("/:id/renew", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), validate(renewSiswaSchema), siswaController.renew);
router.post("/:id/aktivasi", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), siswaController.aktivasi);
router.put("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), validate(updateSiswaSchema), siswaController.update);
router.delete("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), siswaController.remove);

module.exports = router;
