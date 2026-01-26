const express = require("express");
const jadwalController = require("../controllers/jadwal.controller");
const { requireAuth, requireAnyRole } = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", requireAuth, jadwalController.list);
router.get(
  "/privat/summary",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listPrivatSummary
);
router.get(
  "/privat/:enrollmentId/slots",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listPrivatSlots
);
router.get(
  "/kelas/summary",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listKelasSummary
);
router.get(
  "/kelas/groups",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listKelasGroups
);
router.get(
  "/kelas/:kelasId/slots",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listKelasSlots
);
router.get(
  "/privat/siswa",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listPrivatSiswa
);
router.get(
  "/kelas/programs/siswa",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listKelasSiswaByPrograms
);
router.get(
  "/kelas/:kelasId/siswa",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.listKelasSiswa
);
router.post(
  "/privat",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.createPrivat
);
router.post(
  "/kelas",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.createKelas
);
router.delete(
  "/privat/enrollment/:enrollmentId",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.removePrivat
);
router.delete(
  "/kelas/:kelasId",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.removeKelas
);
router.patch(
  "/:id",
  requireAnyRole(["super_admin", "admin_cabang"]),
  jadwalController.update
);

module.exports = router;
