const express = require("express");
const authController = require("../controllers/auth.controller");
const { requireAuth } = require("../middlewares/auth.middleware");

const router = express.Router();

router.post("/login", authController.login);
router.post("/logout", authController.logout);
router.get("/session", authController.sessionInfo);
router.get("/menu", requireAuth, authController.menu);

module.exports = router;
