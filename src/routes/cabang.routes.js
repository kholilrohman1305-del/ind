const express = require("express");
const cabangController = require("../controllers/cabang.controller");
const { requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const { validate } = require("../middlewares/validate.middleware");
const { createCabangSchema, updateCabangSchema } = require("../validators/cabang.validator");

const router = express.Router();

router.get("/", requireRole(ROLES.SUPER_ADMIN), cabangController.getAll);
router.get("/recommendations", requireRole(ROLES.SUPER_ADMIN), cabangController.getRecommendations);
router.post("/", requireRole(ROLES.SUPER_ADMIN), validate(createCabangSchema), cabangController.create);
router.put("/:id", requireRole(ROLES.SUPER_ADMIN), validate(updateCabangSchema), cabangController.update);
router.delete("/:id", requireRole(ROLES.SUPER_ADMIN), cabangController.remove);

module.exports = router;
