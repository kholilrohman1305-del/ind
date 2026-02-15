const express = require("express");
const router = express.Router();
const { requireAuth, requireRole } = require("../middlewares/auth.middleware");
const { ROLES } = require("../config/constants");
const notifikasiController = require("../controllers/notifikasi.controller");

// All routes require authentication
router.use(requireAuth);

// Get user's notifications (all roles)
router.get("/", notifikasiController.getNotifications);

// Mark notification(s) as read (all roles)
router.post("/mark-read", notifikasiController.markAsRead);

// Create announcement (admin cabang only)
router.post("/announcements", requireRole(ROLES.ADMIN_CABANG), notifikasiController.createAnnouncement);

// Get announcements history (admin cabang only)
router.get("/announcements", requireRole(ROLES.ADMIN_CABANG), notifikasiController.getAnnouncements);

module.exports = router;
