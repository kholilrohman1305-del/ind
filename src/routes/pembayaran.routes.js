const express = require("express");
const pembayaranController = require("../controllers/pembayaran.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireAnyRole([ROLES.ADMIN_CABANG, ROLES.SISWA]), pembayaranController.list);
router.post("/", requireAnyRole([ROLES.ADMIN_CABANG]), pembayaranController.create);

module.exports = router;
