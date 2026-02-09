const express = require("express");
const router = express.Router();
const chatbotController = require("../controllers/chatbot.controller");
const { requireAnyRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");

router.post(
  "/query",
  requireAnyRole([ROLES.SUPER_ADMIN, ROLES.ADMIN_CABANG]),
  chatbotController.query
);

module.exports = router;