const express = require("express");
const promoController = require("../controllers/promo.controller");
const { requireRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireRole("admin_cabang"), promoController.list);
router.post("/", requireRole("admin_cabang"), promoController.create);
router.patch("/:id", requireRole("admin_cabang"), promoController.update);
router.delete("/:id", requireRole("admin_cabang"), promoController.remove);

module.exports = router;
