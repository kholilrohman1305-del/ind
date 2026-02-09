const pengajuanJadwalService = require("../services/pengajuan-jadwal.service");
const edukatorService = require("../services/edukator.service");
const { ROLES } = require("../config/constants");

const list = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;

    let edukatorId = null;
    if (role === ROLES.EDUKATOR) {
      edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
      if (!edukatorId) {
        return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
      }
    } else {
      edukatorId = req.query.edukatorId || null;
    }

    const status = req.query.status || null;

    const data = await pengajuanJadwalService.listPengajuan({
      edukatorId,
      cabangId,
      status
    });

    return res.json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getById = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;

    const pengajuan = await pengajuanJadwalService.getPengajuanById(id);
    if (!pengajuan) {
      return res.status(404).json({ success: false, message: "Pengajuan tidak ditemukan" });
    }

    // Authorization check
    if (role === ROLES.EDUKATOR) {
      const edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
      if (pengajuan.edukator_id !== edukatorId) {
        return res.status(403).json({ success: false, message: "Forbidden" });
      }
    } else if (role === ROLES.ADMIN_CABANG && pengajuan.jadwal_cabang_id !== cabangId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    return res.json({ success: true, data: pengajuan });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const { jadwal_id, tipe, alasan, tanggal_usulan, jam_mulai_usulan, jam_selesai_usulan } = req.body;

    if (!jadwal_id || !tipe || !alasan) {
      return res.status(400).json({ success: false, message: "Field wajib belum lengkap" });
    }

    if (tipe === "reschedule") {
      if (!tanggal_usulan || !jam_mulai_usulan || !jam_selesai_usulan) {
        return res.status(400).json({
          success: false,
          message: "Reschedule memerlukan tanggal dan jam usulan"
        });
      }
    }

    const edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
    if (!edukatorId) {
      return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
    }

    const result = await pengajuanJadwalService.createPengajuan(req.body, edukatorId);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const approve = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const catatanAdmin = req.body.catatan_admin || null;

    await pengajuanJadwalService.approvePengajuan(
      id,
      req.session.user.id,
      catatanAdmin,
      cabangId
    );

    return res.json({ success: true, message: "Pengajuan disetujui" });
  } catch (err) {
    if (err.message.includes("tidak memiliki akses") || err.message.includes("Forbidden")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    if (err.message.includes("tidak ditemukan")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

const reject = async (req, res) => {
  try {
    const id = req.params.id;
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const catatanAdmin = req.body.catatan_admin;

    if (!catatanAdmin) {
      return res.status(400).json({
        success: false,
        message: "Catatan wajib diisi saat menolak"
      });
    }

    await pengajuanJadwalService.rejectPengajuan(
      id,
      req.session.user.id,
      catatanAdmin,
      cabangId
    );

    return res.json({ success: true, message: "Pengajuan ditolak" });
  } catch (err) {
    if (err.message.includes("tidak memiliki akses") || err.message.includes("Forbidden")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    if (err.message.includes("tidak ditemukan")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

const cancel = async (req, res) => {
  try {
    const id = req.params.id;

    const edukatorId = await edukatorService.getEdukatorIdByUserId(req.session.user.id);
    if (!edukatorId) {
      return res.status(404).json({ success: false, message: "Edukator tidak ditemukan." });
    }

    await pengajuanJadwalService.cancelPengajuan(id, edukatorId);
    return res.json({ success: true, message: "Pengajuan dibatalkan" });
  } catch (err) {
    if (err.message.includes("tidak memiliki akses")) {
      return res.status(403).json({ success: false, message: err.message });
    }
    if (err.message.includes("tidak ditemukan")) {
      return res.status(404).json({ success: false, message: err.message });
    }
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  list,
  getById,
  create,
  approve,
  reject,
  cancel,
};
