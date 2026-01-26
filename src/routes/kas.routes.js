const express = require("express");
const kasController = require("../controllers/kas.controller");
const { requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireRole("admin_cabang"), kasController.summary);
router.get("/entries", requireRole("admin_cabang"), kasController.entries);
router.post("/saldo", requireRole("admin_cabang"), kasController.setSaldo);

module.exports = router;
