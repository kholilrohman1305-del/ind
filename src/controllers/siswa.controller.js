const db = require("../db");
const siswaService = require("../services/siswa.service");
const programService = require("../services/program.service");
const aktivasiService = require("../services/aktivasi.service");
const { ROLES } = require("../config/constants");
const { parsePagination, paginatedResponse } = require("../utils/pagination");

const getAll = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const { page, limit, offset } = parsePagination(req.query);
    const { rows, total } = await siswaService.listSiswa(cabangId, { limit, offset });
    return res.json(paginatedResponse(rows, total, { page, limit }));
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const role = req.session.user.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : req.body.cabang_id;
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
    if (role === ROLES.ADMIN_CABANG && program.cabang_id !== cabangId) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const payload = { ...req.body, cabang_id: cabangId, edukator_id: req.body.edukator_id || null };
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
    if (role === ROLES.ADMIN_CABANG && existing.cabang_id !== req.session.user.cabang_id) {
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
    if (role === ROLES.ADMIN_CABANG && existing.cabang_id !== req.session.user.cabang_id) {
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
    if (role === ROLES.ADMIN_CABANG && existing.cabang_id !== req.session.user.cabang_id) {
      return res.status(403).json({ success: false, message: "Forbidden" });
    }

    const programId = req.body.program_id || null;
    const startDate = req.body.start_date || null;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : existing.cabang_id;
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

const aktivasi = async (req, res) => {
  try {
    const role = req.session.user.role;
    const id = req.params.id;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user.cabang_id : null;
    const result = await aktivasiService.aktivasiSiswa(id, cabangId);
    return res.json({ success: true, ...result });
  } catch (err) {
    return res.status(400).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAll,
  aktivasi,
  getProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const profile = await siswaService.getProfileByUserId(userId);
      if (!profile) {
        return res.status(404).json({ success: false, message: "Profil siswa tidak ditemukan." });
      }
      return res.json({ success: true, data: profile });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  updateProfile: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const updated = await siswaService.updateProfileByUserId(userId, req.body);
      if (!updated) {
        return res.status(404).json({ success: false, message: "Profil siswa tidak ditemukan." });
      }
      if (req.body.email) {
        req.session.user.email = req.body.email;
      }
      return res.json({ success: true, data: updated });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  getPrograms: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const rows = await siswaService.listProgramsByUserId(userId);
      return res.json({ success: true, data: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  getRecommendedPrograms: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const rows = await siswaService.getRecommendedProgramsByUserId(userId);
      return res.json({ success: true, data: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  getTagihanSummary: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const summary = await siswaService.getTagihanSummaryByUserId(userId);
      return res.json({ success: true, data: summary });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  renewProgramSelf: async (req, res) => {
    try {
      const userId = req.session.user.id;
      const programId = req.body.program_id || null;
      const startDate = req.body.start_date || null;
      const result = await siswaService.renewProgramByUserId({ userId, programId, startDate });
      return res.json({ success: true, data: result });
    } catch (err) {
      return res.status(400).json({ success: false, message: err.message });
    }
  },
  getEdukators: async (req, res) => {
    try {
      const userId = req.session.user.id;

      // Ambil ID siswa dari tabel siswa berdasarkan user_id
      const [siswaRows] = await db.query("SELECT id FROM siswa WHERE user_id = ?", [userId]);
      if (!siswaRows.length) {
        return res.status(404).json({ success: false, message: "Siswa tidak ditemukan." });
      }

      const siswaId = siswaRows[0].id;

      // Ambil edukator yang pernah mengajar siswa ini melalui jadwal
      const [edukatorRows] = await db.query(`
        SELECT DISTINCT e.id, e.nama
        FROM edukator e
        JOIN jadwal j ON e.id = j.edukator_id
        JOIN enrollment en ON en.id = j.enrollment_id
        WHERE en.siswa_id = ?
        AND e.is_active = 1
        ORDER BY e.nama
      `, [siswaId]);

      return res.json({ success: true, data: edukatorRows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  create,
  update,
  remove,
  renew,
};
