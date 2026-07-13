const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");
const { validate } = require("../middlewares/validate.middleware");
const { loginSchema, biometricLoginSchema } = require("../validators/auth.validator");

const router = express.Router();

router.post("/login", validate(loginSchema), authController.login);
router.post("/logout", authController.logout);
router.get("/session", authController.sessionInfo);
router.get("/menu", requireAuth, authController.menu);
router.post("/biometric/register", requireAuth, authController.biometricRegister);
router.post("/biometric/login", validate(biometricLoginSchema), authController.biometricLogin);
router.post("/biometric/unregister", requireAuth, authController.biometricUnregister);

module.exports = router;
