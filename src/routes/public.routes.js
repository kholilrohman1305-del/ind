const express = require("express");
const router = express.Router();
const publicController = require("../controllers/public.controller");

router.get("/programs", publicController.getPrograms);
router.get("/banners", publicController.getBanners);
router.get("/edukators", publicController.getEdukators);
router.get("/options", publicController.getOptions);
router.post("/register/siswa", publicController.registerSiswa);
router.post("/register/edukator", publicController.registerEdukator);

module.exports = router;