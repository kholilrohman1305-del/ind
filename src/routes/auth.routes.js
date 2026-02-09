const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { loginSchema } = require("../validators/auth.validator");

const router = express.Router();

router.post("/login", validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/session", authController.sessionInfo);
router.get("/menu", requireAuth, authController.menu);

module.exports = router;
