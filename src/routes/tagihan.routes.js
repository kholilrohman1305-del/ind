const express = require("express");
const tagihanController = require("../controllers/tagihan.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["admin_cabang", "siswa"]), tagihanController.list);
router.get("/enrollments", requireAnyRole(["admin_cabang"]), tagihanController.listEnrollments);
router.post("/", requireAnyRole(["admin_cabang"]), tagihanController.create);
router.delete("/:id", requireAnyRole(["admin_cabang"]), tagihanController.remove);

module.exports = router;
