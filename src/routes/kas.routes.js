const express = require("express");
const kasController = require("../controllers/kas.controller");
const { requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireRole(ROLES.ADMIN_CABANG), kasController.summary);
router.get("/entries", requireRole(ROLES.ADMIN_CABANG), kasController.entries);
router.post("/saldo", requireRole(ROLES.ADMIN_CABANG), kasController.setSaldo);

module.exports = router;
