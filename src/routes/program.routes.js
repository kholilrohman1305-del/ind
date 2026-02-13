const express = require("express");
const programController = require("../controllers/program.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { createUploader } = require("../middlewares/upload.middleware");

const router = express.Router();
const { upload, processImage } = createUploader("programs", 800, 600);

router.get("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), programController.getAll);
router.post("/", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), upload.single("gambar"), processImage, programController.create);
router.put("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), upload.single("gambar"), processImage, programController.update);
router.delete("/:id", requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]), programController.remove);

module.exports = router;
