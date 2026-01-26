const express = require("express");
const cabangController = require("../controllers/cabang.controller");
const { requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireRole("super_admin"), cabangController.getAll);
router.post("/", requireRole("super_admin"), cabangController.create);
router.put("/:id", requireRole("super_admin"), cabangController.update);
router.delete("/:id", requireRole("super_admin"), cabangController.remove);

module.exports = router;
