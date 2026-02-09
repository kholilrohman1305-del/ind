const express = require("express");
const tagihanController = require("../controllers/tagihan.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.ADMIN_CABANG, ROLES.SISWA]), tagihanController.list);
router.get("/enrollments", requireAnyRole([ROLES.ADMIN_CABANG]), tagihanController.listEnrollments);
router.post("/", requireAnyRole([ROLES.ADMIN_CABANG]), tagihanController.create);
router.delete("/:id", requireAnyRole([ROLES.ADMIN_CABANG]), tagihanController.remove);

module.exports = router;
