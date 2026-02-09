const express = require("express");
const promoController = require("../controllers/promo.controller");
const { requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

const router = express.Router();

router.get("/", requireRole(ROLES.ADMIN_CABANG), promoController.list);
router.post("/", requireRole(ROLES.ADMIN_CABANG), promoController.create);
router.patch("/:id", requireRole(ROLES.ADMIN_CABANG), promoController.update);
router.delete("/:id", requireRole(ROLES.ADMIN_CABANG), promoController.remove);

module.exports = router;
