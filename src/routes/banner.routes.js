const express = require("express");
const router = express.Router();
const bannerController = require("../controllers/banner.controller");
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { createUploader } = require("../middlewares/upload.middleware");

const { upload, processImage } = createUploader("banners", 1920, 600);

router.use(requireAuth);
router.use(requireRole(ROLES.SUPER_ADMIN));

router.get("/", bannerController.getAll);
router.post("/", upload.single("gambar"), processImage, bannerController.create);
router.put("/reorder", bannerController.reorder);
router.put("/:id", upload.single("gambar"), processImage, bannerController.update);
router.patch("/:id/toggle", bannerController.toggleActive);
router.delete("/:id", bannerController.remove);

module.exports = router;
