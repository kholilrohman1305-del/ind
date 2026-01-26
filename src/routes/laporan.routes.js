const express = require("express");
const laporanController = require("../controllers/laporan.controller");
const { requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/keuangan", requireRole("admin_cabang"), laporanController.keuangan);
router.get("/lanjutan", requireRole("admin_cabang"), laporanController.lanjutan);

module.exports = router;
