const express = require("express");
const pengajuanJadwalController = require("../controllers/pengajuan-jadwal.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { createPengajuanSchema, approvePengajuanSchema, rejectPengajuanSchema, cancelPengajuanSchema } = require("../validators/pengajuan-jadwal.validator");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.EDUKATOR, ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), pengajuanJadwalController.list);
router.get("/:id", requireAnyRole([ROLES.EDUKATOR, ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), pengajuanJadwalController.getById);
router.post("/", requireAnyRole([ROLES.EDUKATOR]), validate(createPengajuanSchema), pengajuanJadwalController.create);
router.put("/:id/approve", requireAnyRole([ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), validate(approvePengajuanSchema), pengajuanJadwalController.approve);
router.put("/:id/reject", requireAnyRole([ROLES.ADMIN_CABANG, ROLES.SUPER_ADMIN]), validate(rejectPengajuanSchema), pengajuanJadwalController.reject);
router.delete("/:id", requireAnyRole([ROLES.EDUKATOR]), validate(cancelPengajuanSchema), pengajuanJadwalController.cancel);

module.exports = router;
