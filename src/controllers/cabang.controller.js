const cabangService = require("../services/cabang.service");
const dashboardService = require("../services/dashboard.service");
const kasService = require("../services/kas.service");
const feedbackService = require("../services/feedback.service");
const db = require("../db");

const getAll = async (req, res) => {
  try {
    const rows = await cabangService.listCabang();
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const create = async (req, res) => {
  try {
    const result = await cabangService.createCabang(req.body);
    return res.json({ success: true, data: result });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const update = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await cabangService.getCabangById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Cabang tidak ditemukan." });
    }
    await cabangService.updateCabang(id, req.body, existing);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const remove = async (req, res) => {
  try {
    const id = req.params.id;
    const existing = await cabangService.getCabangById(id);
    if (!existing) {
      return res.status(404).json({ success: false, message: "Cabang tidak ditemukan." });
    }
    await cabangService.deleteCabang(id);
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

const getDetail = async (req, res) => {
  try {
    const id = req.params.id;
    const now = new Date();
    const year = Number(req.query.year || now.getFullYear());
    const month = Number(req.query.month || now.getMonth() + 1);

    const cabang = await cabangService.getCabangById(id);
    if (!cabang) {
      return res.status(404).json({ success: false, message: "Cabang tidak ditemukan." });
    }

    const [analytics, kasSummary, kasEntries, feedbackStats, recentFeedback, manajemenData] = await Promise.all([
      dashboardService.getCabangAnalytics({ cabangId: id, year, month }).catch(() => null),
      kasService.getSummary({ cabangId: id, year, month }).catch(() => null),
      kasService.listEntries({ cabangId: id, year, month }, { limit: 10 }).catch(() => ({ rows: [], total: 0 })),
      feedbackService.getFeedbackStats({ cabang_id: id }).catch(() => null),
      feedbackService.getRecentFeedback({ cabangId: id, limit: 5 }).catch(() => []),
      db.query(`
        SELECT m.id, m.nama AS jabatan, m.gaji_tambahan,
               e.id AS edukator_id, e.nama AS edukator_nama, e.pendidikan_terakhir, e.foto
        FROM manajemen m
        LEFT JOIN edukator e ON e.manajemen_id = m.id AND e.is_active = 1
        WHERE m.cabang_id = ?
        ORDER BY m.nama ASC, e.nama ASC
      `, [id]).then(([rows]) => rows).catch(() => []),
    ]);

    const cabangStats = analytics?.cabang?.find(c => String(c.cabang_id) === String(id)) || {};

    // Group manajemen by jabatan
    const manajemenMap = {};
    (manajemenData || []).forEach((row) => {
      if (!manajemenMap[row.id]) {
        manajemenMap[row.id] = { id: row.id, jabatan: row.jabatan, gaji_tambahan: row.gaji_tambahan, edukators: [] };
      }
      if (row.edukator_id) {
        manajemenMap[row.id].edukators.push({
          id: row.edukator_id, nama: row.edukator_nama,
          pendidikan_terakhir: row.pendidikan_terakhir, foto: row.foto,
        });
      }
    });

    return res.json({
      success: true,
      data: {
        cabang,
        statistik: {
          total_siswa: cabangStats.total_siswa || 0,
          siswa_aktif: cabangStats.siswa_aktif || 0,
          siswa_baru: cabangStats.siswa_baru || 0,
          total_edukator: cabangStats.total_edukator || 0,
          pendapatan: cabangStats.pendapatan || 0,
          pengeluaran: cabangStats.pengeluaran || 0,
          selisih: cabangStats.selisih || 0,
        },
        keuangan: {
          summary: kasSummary,
          entries: kasEntries.rows || [],
        },
        feedback: {
          stats: feedbackStats,
          recent: recentFeedback,
        },
        manajemen: Object.values(manajemenMap),
      },
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getAll,
  getDetail,
  getRecommendations: async (req, res) => {
    try {
      const months = req.query.months ? Number(req.query.months) : 6;
      const k = req.query.k ? Number(req.query.k) : 3;
      const radiusKm = req.query.radius_km ? Number(req.query.radius_km) : 3;
      const rows = await cabangService.getCabangRecommendations({ months, k, radiusKm });
      return res.json({ success: true, data: rows });
    } catch (err) {
      return res.status(500).json({ success: false, message: err.message });
    }
  },
  create,
  update,
  remove,
};
