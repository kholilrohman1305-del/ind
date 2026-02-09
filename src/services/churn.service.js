const db = require("../db");
const { PRESENSI_STATUS, TAGIHAN_STATUS } = require("../config/constants");

// Kamus kata untuk analisis sentimen sederhana
const POSITIVE_WORDS = ["baik", "bagus", "meningkat", "rajin", "aktif", "pintar", "cerdas", "semangat", "fokus", "lancar", "paham", "mengerti", "cepat", "tepat", "antusias", "senang", "positif", "maju", "hebat", "luar biasa", "tuntas", "selesai"];
const NEGATIVE_WORDS = ["kurang", "lambat", "malas", "susah", "sulit", "bingung", "lupa", "tidak", "belum", "pasif", "mengantuk", "telat", "terlambat", "gaduh", "ramai", "turun", "jelek", "negatif", "masalah", "kendala", "gagal"];

const analyzeSentimentRisk = (text) => {
  if (!text) return 50; // Netral (Risk 50%)
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  let score = 0;
  words.forEach(w => {
    if (POSITIVE_WORDS.includes(w)) score += 1;
    if (NEGATIVE_WORDS.includes(w)) score -= 1;
  });
  
  if (score > 0) return 0;   // Positif -> Low Risk
  if (score < 0) return 100; // Negatif -> High Risk
  return 50;                 // Netral -> Medium Risk
};

const getStudentRisks = async (cabangId) => {
  const params = [];
  let branchFilter = "";
  if (cabangId) {
    branchFilter = "AND s.cabang_id = ?";
    params.push(cabangId);
  }

  // 1. Ambil Siswa Aktif
  const [students] = await db.query(
    `SELECT s.id, s.nama FROM siswa s WHERE s.is_active = 1 ${branchFilter}`,
    params
  );

  if (!students.length) return [];

  const studentIds = students.map(s => s.id);

  // 2. Data Kehadiran (60 Hari Terakhir)
  // Hitung rasio kehadiran dari presensi_siswa
  const [attendanceRows] = await db.query(
    `SELECT 
        ps.siswa_id,
        COUNT(*) as total_sessions,
        SUM(CASE WHEN ps.status_presensi_siswa = '${PRESENSI_STATUS.HADIR}' THEN 1 ELSE 0 END) as present_count
     FROM presensi_siswa ps
     JOIN presensi p ON p.id = ps.presensi_id
     WHERE ps.siswa_id IN (?) AND p.waktu_absen >= DATE_SUB(NOW(), INTERVAL 60 DAY)
     GROUP BY ps.siswa_id`,
    [studentIds]
  );

  // 3. Data Pembayaran (Tagihan Menunggak)
  const [paymentRows] = await db.query(
    `SELECT 
        t.siswa_id,
        COUNT(*) as overdue_count
     FROM tagihan t
     WHERE t.siswa_id IN (?) 
       AND t.status_tagihan != '${TAGIHAN_STATUS.LUNAS}'
       AND t.tanggal_jatuh_tempo < CURDATE()
     GROUP BY t.siswa_id`,
    [studentIds]
  );

  // 4. Data Sentimen (3 Catatan Terakhir)
  const [noteRows] = await db.query(
    `SELECT siswa_id, catatan 
     FROM (
       SELECT siswa_id, catatan,
              ROW_NUMBER() OVER (PARTITION BY siswa_id ORDER BY tanggal DESC) as rn
       FROM catatan_siswa
       WHERE siswa_id IN (?)
     ) sub
     WHERE rn <= 3`,
    [studentIds]
  );

  // Mapping Data
  const attendanceMap = {};
  attendanceRows.forEach(r => attendanceMap[r.siswa_id] = r);

  const paymentMap = {};
  paymentRows.forEach(r => paymentMap[r.siswa_id] = r.overdue_count);

  const notesMap = {};
  noteRows.forEach(r => {
    if (!notesMap[r.siswa_id]) notesMap[r.siswa_id] = [];
    notesMap[r.siswa_id].push(r.catatan);
  });

  // Kalkulasi Skor Risiko
  const results = students.map(student => {
    const id = student.id;
    
    // A. Risiko Kehadiran (Bobot 30%)
    let attendanceRisk = 0;
    const att = attendanceMap[id];
    if (att && att.total_sessions > 0) {
        const rate = att.present_count / att.total_sessions;
        if (rate < 0.5) attendanceRisk = 100;      // < 50% hadir -> Bahaya
        else if (rate < 0.75) attendanceRisk = 50; // < 75% hadir -> Waspada
    }

    // B. Risiko Pembayaran (Bobot 30%)
    let paymentRisk = 0;
    const overdue = paymentMap[id] || 0;
    if (overdue > 0) paymentRisk = 100; // Ada tunggakan -> Bahaya
    
    // C. Risiko Sentimen (Bobot 40%)
    let sentimentRisk = 0;
    const notes = notesMap[id] || [];
    if (notes.length > 0) {
        const totalScore = notes.reduce((acc, note) => acc + analyzeSentimentRisk(note), 0);
        sentimentRisk = totalScore / notes.length;
    }

    // Total Weighted Score
    const totalRisk = (attendanceRisk * 0.3) + (paymentRisk * 0.3) + (sentimentRisk * 0.4);
    
    return {
        id: student.id,
        risk_score: Math.round(totalRisk),
        details: {
            attendance: attendanceRisk,
            payment: paymentRisk,
            sentiment: Math.round(sentimentRisk)
        }
    };
  });

  // Return hanya yang memiliki risiko > 0, diurutkan dari tertinggi
  return results.filter(r => r.risk_score > 0).sort((a, b) => b.risk_score - a.risk_score);
};

const getStudentRiskDetails = async (studentId) => {
  // 1. Attendance Trend (Last 6 months)
  const [attendance] = await db.query(`
    SELECT DATE_FORMAT(p.waktu_absen, '%Y-%m') as month,
           COUNT(*) as total,
           SUM(CASE WHEN ps.status_presensi_siswa = '${PRESENSI_STATUS.HADIR}' THEN 1 ELSE 0 END) as present
    FROM presensi_siswa ps
    JOIN presensi p ON p.id = ps.presensi_id
    WHERE ps.siswa_id = ? AND p.waktu_absen >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY month
    ORDER BY month ASC
  `, [studentId]);

  // 2. Payment Trend (Last 6 months)
  const [payments] = await db.query(`
    SELECT DATE_FORMAT(tanggal_jatuh_tempo, '%Y-%m') as month,
           COUNT(*) as total_bills,
           SUM(CASE WHEN status_tagihan != '${TAGIHAN_STATUS.LUNAS}' AND tanggal_jatuh_tempo < CURDATE() THEN 1 ELSE 0 END) as overdue
    FROM tagihan
    WHERE siswa_id = ? AND tanggal_jatuh_tempo >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
    GROUP BY month
    ORDER BY month ASC
  `, [studentId]);

  // 3. Sentiment Trend (Last 5 notes)
  const [notes] = await db.query(`
    SELECT tanggal, catatan
    FROM catatan_siswa
    WHERE siswa_id = ?
    ORDER BY tanggal DESC
    LIMIT 5
  `, [studentId]);

  // Reverse to show chronological order in chart
  const sentimentTrend = notes.reverse().map(n => ({
    date: n.tanggal,
    risk_score: analyzeSentimentRisk(n.catatan)
  }));

  return { attendance, payments, sentimentTrend };
};

module.exports = { getStudentRisks, getStudentRiskDetails };