const siswaService = require("../services/siswa.service");
const programService = require("../services/program.service");

const getAll = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : null;
    const rows = await siswaService.listSiswa(cabangId);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : req.body.cabang_id;
    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang wajib diisi." });
    }
    const programId = req.body.program_id;
    if (!programId) {
      return res.status(400).json({ success: false, message: "Program wajib dipilih." });
    }

    const program = await programService.getProgramById(programId);
    if (!program) {
      return res.status(400).json({ success: false, message: "Program tidak ditemukan." });
    }
    if (role === "admin_cabang" && program.cabang_id !== cabangId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const payload = { ...req.body, cabang_id: cabangId };
    const result = await siswaService.createSiswa(payload);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const existing = await siswaService.getSiswaById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
    }
    if (role === "admin_cabang" && existing.cabang_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    const payload = { ...req.body, id };
    const result = await siswaService.updateSiswa(payload, existing);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const existing = await siswaService.getSiswaById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
    }
    if (role === "admin_cabang" && existing.cabang_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }
    await siswaService.deleteSiswa(id, existing.user_id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const renew = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const existing = await siswaService.getSiswaById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
    }
    if (role === "admin_cabang" && existing.cabang_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const programId = req.body.program_id || null;
    const startDate = req.body.start_date || null;
    const cabangId = role === "admin_cabang" ? req.session.user.cabang_id : existing.cabang_id;
    const result = await siswaService.renewProgram({
      siswaId: id,
      programId,
      startDate,
      cabangId,
    });
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
  renew,
};
