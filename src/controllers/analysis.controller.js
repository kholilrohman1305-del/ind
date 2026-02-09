const feedbackService = require("../services/feedback.service");
const { ROLES } = require("../config/constants");

// Fungsi untuk mendapatkan data untuk grafik analisis sentimen
const getSentimentData = async (req, res) => {
  try {
    // Filter cabang untuk admin_cabang
    const role = req.session.user?.role;
    const cabangId = role === ROLES.ADMIN_CABANG ? req.session.user?.cabang_id : null;

    const periode = req.query.periode || null;
    const baseFilter = cabangId ? { cabang_id: cabangId } : {};
    if (periode) baseFilter.periode = periode;

    // Dapatkan statistik umum
    const generalStats = await feedbackService.getFeedbackStats(baseFilter);

    // Dapatkan statistik berdasarkan jenis feedback
    const umumStats = await feedbackService.getFeedbackStats({ ...baseFilter, jenis_feedback: 'umum' });
    const programStats = await feedbackService.getFeedbackStats({ ...baseFilter, jenis_feedback: 'program' });
    const edukatorStats = await feedbackService.getFeedbackStats({ ...baseFilter, jenis_feedback: 'edukator' });
    const testimonialStats = await feedbackService.getFeedbackStats({ ...baseFilter, jenis_feedback: 'testimonial' });

    const data = {
      ...generalStats,
      umum_avg_rating: umumStats.avg_rating ? parseFloat(umumStats.avg_rating.toFixed(2)) : 0,
      program_avg_rating: programStats.avg_rating ? parseFloat(programStats.avg_rating.toFixed(2)) : 0,
      edukator_avg_rating: edukatorStats.avg_rating ? parseFloat(edukatorStats.avg_rating.toFixed(2)) : 0,
      testimonial_avg_rating: testimonialStats.avg_rating ? parseFloat(testimonialStats.avg_rating.toFixed(2)) : 0,
      materi_avg: generalStats.materi_avg ? parseFloat(Number(generalStats.materi_avg).toFixed(2)) : 0,
      aspek_edukator_avg: generalStats.edukator_avg ? parseFloat(Number(generalStats.edukator_avg).toFixed(2)) : 0,
      fasilitas_avg: generalStats.fasilitas_avg ? parseFloat(Number(generalStats.fasilitas_avg).toFixed(2)) : 0,
      pelayanan_avg: generalStats.pelayanan_avg ? parseFloat(Number(generalStats.pelayanan_avg).toFixed(2)) : 0
    };

    res.json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Fungsi dummy untuk getBundlingRules karena saya tidak menemukan definisi aslinya
const getBundlingRules = async (req, res) => {
  try {
    // Ini adalah fungsi dummy, Anda mungkin perlu menggantinya dengan implementasi aslinya
    res.json({ 
      success: true, 
      data: {
        rules: [],
        total_rules: 0
      },
      message: "Fungsi getBundlingRules belum diimplementasikan secara lengkap"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Fungsi dummy untuk fungsi-fungsi lain yang mungkin digunakan
const getPerformanceData = async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: {
        performance: [],
        average: 0
      },
      message: "Fungsi getPerformanceData belum diimplementasikan secara lengkap"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getEnrollmentData = async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: {
        enrollment: [],
        total: 0
      },
      message: "Fungsi getEnrollmentData belum diimplementasikan secara lengkap"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

const getFinancialData = async (req, res) => {
  try {
    res.json({ 
      success: true, 
      data: {
        financial: [],
        total: 0
      },
      message: "Fungsi getFinancialData belum diimplementasikan secara lengkap"
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  getSentimentData,
  getBundlingRules,
  getPerformanceData,
  getEnrollmentData,
  getFinancialData
};
