const db = require("../db");
const { analyzeSentiment } = require("../utils/sentiment-analyzer");

/**
 * Membuat feedback baru dari siswa
 */
const createFeedback = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const { user_id, program_id, edukator_id, jenis_feedback, rating, komentar, aspek_penilaian } = payload;

    // Analisis sentimen dari komentar
    const sentimentResult = await analyzeSentiment(komentar || "");
    let finalSentiment = sentimentResult.sentiment;
    let finalConfidence = sentimentResult.confidence;

    const ratingValue = Number(rating || 0);
    const hasComment = typeof komentar === "string" && komentar.trim().length > 0;

    // Jika komentar kosong atau sentimen netral, gunakan rating untuk menentukan sentimen
    if (!hasComment || finalSentiment === "netral") {
      if (ratingValue >= 4) {
        finalSentiment = "positif";
        finalConfidence = Math.max(finalConfidence, 0.7);
      } else if (ratingValue > 0 && ratingValue <= 2) {
        finalSentiment = "negatif";
        finalConfidence = Math.max(finalConfidence, 0.7);
      }
    }

    const [result] = await conn.query(
      `INSERT INTO feedback 
       (user_id, program_id, edukator_id, jenis_feedback, rating, komentar, aspek_penilaian, hasil_sentimen, confidence_score) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        user_id,
        program_id,
        edukator_id,
        jenis_feedback || 'umum',
        rating,
        komentar,
        aspek_penilaian ? JSON.stringify(aspek_penilaian) : null,
        finalSentiment,
        finalConfidence
      ]
    );

    await conn.commit();
    return { id: result.insertId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

/**
 * Mendapatkan feedback berdasarkan user
 */
const getFeedbackByUser = async (userId) => {
  const [rows] = await db.query(
    `SELECT f.*, s.nama as user_nama, p.nama as program_nama, e.nama as edukator_nama
     FROM feedback f
     LEFT JOIN siswa s ON s.user_id = f.user_id
     LEFT JOIN program p ON p.id = f.program_id
     LEFT JOIN edukator e ON e.id = f.edukator_id
     WHERE f.user_id = ?
     ORDER BY f.created_at DESC`,
    [userId]
  );
  return rows;
};

/**
 * Mendapatkan feedback berdasarkan program
 */
const getFeedbackByProgram = async (programId) => {
  const [rows] = await db.query(
    `SELECT f.*, s.nama as user_nama
     FROM feedback f
     LEFT JOIN siswa s ON s.user_id = f.user_id
     WHERE f.program_id = ?
     ORDER BY f.created_at DESC`,
    [programId]
  );
  return rows;
};

/**
 * Mendapatkan feedback berdasarkan edukator
 */
const getFeedbackByEdukator = async (edukatorId) => {
  const [rows] = await db.query(
    `SELECT f.*, s.nama as user_nama, p.nama as program_nama
     FROM feedback f
     LEFT JOIN siswa s ON s.user_id = f.user_id
     LEFT JOIN program p ON p.id = f.program_id
     WHERE f.edukator_id = ?
     ORDER BY f.created_at DESC`,
    [edukatorId]
  );
  return rows;
};

/**
 * Mendapatkan statistik umpan balik
 */
const resolvePeriodeRange = (periode) => {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const formatDate = (date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  if (periode === "last_month") {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 0);
    return { start: formatDate(start), end: formatDate(end) };
  }
  if (periode === "this_year") {
    const start = new Date(year, 0, 1);
    const end = new Date(year, 11, 31);
    return { start: formatDate(start), end: formatDate(end) };
  }
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0);
  return { start: formatDate(start), end: formatDate(end) };
};

const applyDateFilter = (filters, whereClause, params) => {
  if (filters.start_date && filters.end_date) {
    whereClause += " AND DATE(f.created_at) BETWEEN ? AND ?";
    params.push(filters.start_date, filters.end_date);
    return { whereClause, params };
  }
  if (filters.periode) {
    const range = resolvePeriodeRange(filters.periode);
    if (range) {
      whereClause += " AND DATE(f.created_at) BETWEEN ? AND ?";
      params.push(range.start, range.end);
    }
  }
  return { whereClause, params };
};

const getFeedbackStats = async (filters = {}) => {
  let whereClause = "WHERE 1=1";
  let params = [];

  // Filter cabang (by siswa cabang or program cabang)
  if (filters.cabang_id) {
    whereClause += " AND (s.cabang_id = ? OR p.cabang_id = ?)";
    params.push(filters.cabang_id, filters.cabang_id);
  }

  if (filters.program_id) {
    whereClause += " AND f.program_id = ?";
    params.push(filters.program_id);
  }

  if (filters.edukator_id) {
    whereClause += " AND f.edukator_id = ?";
    params.push(filters.edukator_id);
  }

  if (filters.jenis_feedback) {
    whereClause += " AND f.jenis_feedback = ?";
    params.push(filters.jenis_feedback);
  }

  ({ whereClause, params } = applyDateFilter(filters, whereClause, params));

  const [stats] = await db.query(
    `SELECT
       COUNT(*) as total_feedback,
       AVG(f.rating) as avg_rating,
       AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(f.aspek_penilaian, '$.materi')) AS DECIMAL(10,2))) as materi_avg,
       AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(f.aspek_penilaian, '$.edukator')) AS DECIMAL(10,2))) as edukator_avg,
       AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(f.aspek_penilaian, '$.fasilitas')) AS DECIMAL(10,2))) as fasilitas_avg,
       AVG(CAST(JSON_UNQUOTE(JSON_EXTRACT(f.aspek_penilaian, '$.pelayanan')) AS DECIMAL(10,2))) as pelayanan_avg,
       SUM(CASE WHEN f.hasil_sentimen = 'positif' THEN 1 ELSE 0 END) as positif_count,
       SUM(CASE WHEN f.hasil_sentimen = 'negatif' THEN 1 ELSE 0 END) as negatif_count,
       SUM(CASE WHEN f.hasil_sentimen = 'netral' THEN 1 ELSE 0 END) as netral_count
     FROM feedback f
     LEFT JOIN siswa s ON s.user_id = f.user_id
     LEFT JOIN program p ON p.id = f.program_id
     ${whereClause}`,
    params
  );

  return stats[0];
};

/**
 * Mendapatkan feedback terbaru
 */
const getRecentFeedback = async ({ limit = 10, cabangId = null, search = null, periode = null } = {}) => {
  let whereClause = "WHERE 1=1";
  let params = [];

  // Filter cabang - join dengan siswa/program
  if (cabangId) {
    whereClause += " AND (s.cabang_id = ? OR p.cabang_id = ?)";
    params.push(cabangId, cabangId);
  }

  // Filter pencarian
  if (search) {
    whereClause += " AND (s.nama LIKE ? OR p.nama LIKE ? OR e.nama LIKE ? OR f.komentar LIKE ?)";
    const searchPattern = `%${search}%`;
    params.push(searchPattern, searchPattern, searchPattern, searchPattern);
  }

  ({ whereClause, params } = applyDateFilter({ periode }, whereClause, params));

  params.push(limit);

  const [rows] = await db.query(
    `SELECT f.*, s.nama as user_nama, p.nama as program_nama, e.nama as edukator_nama
     FROM feedback f
     LEFT JOIN siswa s ON s.user_id = f.user_id
     LEFT JOIN program p ON p.id = f.program_id
     LEFT JOIN edukator e ON e.id = f.edukator_id
     ${whereClause}
     ORDER BY f.created_at DESC
     LIMIT ?`,
    params
  );
  return rows;
};

module.exports = {
  createFeedback,
  getFeedbackByUser,
  getFeedbackByProgram,
  getFeedbackByEdukator,
  getFeedbackStats,
  getRecentFeedback
};
