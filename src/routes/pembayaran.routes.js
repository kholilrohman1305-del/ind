const express = require("express");
const pembayaranController = require("../controllers/pembayaran.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAnyRole(["admin_cabang", "siswa"]), pembayaranController.list);
router.post("/", requireAnyRole(["admin_cabang"]), pembayaranController.create);

module.exports = router;
