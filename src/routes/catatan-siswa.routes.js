const express = require("express");
const catatanSiswaController = require("../controllers/catatan-siswa.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { createCatatanSchema, updateCatatanSchema } = require("../validators/catatan-siswa.validator");

const router = express.Router();

router.get("/students", requireAnyRole([ROLES.EDUKATOR, ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), catatanSiswaController.listStudents);
router.get("/siswa/:siswaId", requireAnyRole([ROLES.EDUKATOR, ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), catatanSiswaController.listNotes);
router.post("/", requireAnyRole([ROLES.EDUKATOR]), validate(createCatatanSchema), catatanSiswaController.create);
router.put("/:id", requireAnyRole([ROLES.EDUKATOR]), validate(updateCatatanSchema), catatanSiswaController.update);
router.delete("/:id", requireAnyRole([ROLES.EDUKATOR]), catatanSiswaController.remove);

module.exports = router;
