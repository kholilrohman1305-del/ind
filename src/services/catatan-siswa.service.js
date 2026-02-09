const db = require("../db");

// --- SIMPLE SENTIMENT ANALYSIS ENGINE ---
const POSITIVE_WORDS = ["baik", "bagus", "meningkat", "rajin", "aktif", "pintar", "cerdas", "semangat", "fokus", "lancar", "paham", "mengerti", "cepat", "tepat", "antusias", "senang", "positif", "maju", "hebat", "luar biasa", "tuntas", "selesai"];
const NEGATIVE_WORDS = ["kurang", "lambat", "malas", "susah", "sulit", "bingung", "lupa", "tidak", "belum", "pasif", "mengantuk", "telat", "terlambat", "gaduh", "ramai", "turun", "jelek", "negatif", "masalah", "kendala", "gagal"];

const analyzeSentiment = (text) => {
  if (!text) return { score: 0, label: "Netral" };
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/);
  let score = 0;
  words.forEach(w => {
    if (POSITIVE_WORDS.includes(w)) score += 1;
    if (NEGATIVE_WORDS.includes(w)) score -= 1;
  });
  return { score, label: score > 0 ? "Positif" : score < 0 ? "Perlu Perhatian" : "Netral" };
};

const listStudentsByEdukator = async (edukatorId, cabangId) => {
  const params = [edukatorId];
  const cabangFilter = cabangId ? " AND s.cabang_id = ?" : "";
  if (cabangId) params.push(cabangId);

  const [rows] = await db.query(
    `SELECT DISTINCT
      s.id AS siswa_id,
      s.nama AS siswa_nama,
      s.foto AS siswa_foto,
      COUNT(DISTINCT cs.id) AS total_catatan,
      MAX(cs.tanggal) AS last_catatan_date,
      (SELECT catatan FROM catatan_siswa WHERE siswa_id = s.id AND edukator_id = ? ORDER BY tanggal DESC, id DESC LIMIT 1) as last_catatan_text,
      GROUP_CONCAT(DISTINCT CONCAT(en.id, '|', pr.nama) SEPARATOR ';;;') AS enrollments_raw
    FROM jadwal j
    INNER JOIN enrollment en ON en.id = j.enrollment_id
    INNER JOIN siswa s ON s.id = en.siswa_id
    INNER JOIN program pr ON pr.id = j.program_id
    LEFT JOIN catatan_siswa cs ON cs.siswa_id = s.id AND cs.edukator_id = ?
    WHERE j.edukator_id = ?
      ${cabangFilter}
    GROUP BY s.id
    ORDER BY s.nama ASC`,
    [edukatorId, edukatorId, ...params]
  );

  return rows.map((row) => {
    const enrollments = [];
    if (row.enrollments_raw) {
      const items = row.enrollments_raw.split(";;;");
      items.forEach((item) => {
        const [enrollment_id, program_nama] = item.split("|");
        if (!enrollments.find(e => e.enrollment_id === parseInt(enrollment_id))) {
          enrollments.push({
            enrollment_id: parseInt(enrollment_id),
            program_nama
          });
        }
      });
    }

    const sentiment = analyzeSentiment(row.last_catatan_text);

    return {
      siswa_id: row.siswa_id,
      siswa_nama: row.siswa_nama,
      siswa_foto: row.siswa_foto,
      total_catatan: row.total_catatan || 0,
      last_catatan_date: row.last_catatan_date,
      sentiment, // { score: 1, label: "Positif" }
      enrollments
    };
  });
};

const listNotesBySiswa = async (siswaId, edukatorId, cabangId, filters = {}) => {
  const params = [siswaId];
  let edukatorFilter = "";
  let cabangFilter = "";
  let kategoriFilter = "";
  let dateRangeFilter = "";

  if (edukatorId) {
    edukatorFilter = " AND cs.edukator_id = ?";
    params.push(edukatorId);
  }

  if (cabangId) {
    cabangFilter = " AND s.cabang_id = ?";
    params.push(cabangId);
  }

  if (filters.kategori) {
    kategoriFilter = " AND cs.kategori = ?";
    params.push(filters.kategori);
  }

  if (filters.startDate) {
    dateRangeFilter += " AND cs.tanggal >= ?";
    params.push(filters.startDate);
  }

  if (filters.endDate) {
    dateRangeFilter += " AND cs.tanggal <= ?";
    params.push(filters.endDate);
  }

  const [rows] = await db.query(
    `SELECT
      cs.id,
      cs.edukator_id,
      e.nama AS edukator_nama,
      cs.siswa_id,
      s.nama AS siswa_nama,
      cs.enrollment_id,
      pr.nama AS program_nama,
      cs.jadwal_id,
      j.tanggal AS jadwal_tanggal,
      j.jam_mulai AS jadwal_jam_mulai,
      cs.tanggal,
      cs.catatan,
      cs.kategori,
      cs.created_at,
      cs.updated_at
    FROM catatan_siswa cs
    INNER JOIN edukator e ON e.id = cs.edukator_id
    INNER JOIN siswa s ON s.id = cs.siswa_id
    LEFT JOIN enrollment en ON en.id = cs.enrollment_id
    LEFT JOIN program pr ON pr.id = en.program_id
    LEFT JOIN jadwal j ON j.id = cs.jadwal_id
    WHERE cs.siswa_id = ?
      ${edukatorFilter}
      ${cabangFilter}
      ${kategoriFilter}
      ${dateRangeFilter}
    ORDER BY cs.tanggal DESC, cs.created_at DESC`,
    params
  );

  return rows;
};

const getCatatanById = async (id) => {
  const [rows] = await db.query(
    `SELECT
      cs.id,
      cs.edukator_id,
      e.nama AS edukator_nama,
      cs.siswa_id,
      s.nama AS siswa_nama,
      cs.enrollment_id,
      pr.nama AS program_nama,
      cs.jadwal_id,
      j.tanggal AS jadwal_tanggal,
      j.jam_mulai AS jadwal_jam_mulai,
      cs.tanggal,
      cs.catatan,
      cs.kategori,
      cs.created_at,
      cs.updated_at
    FROM catatan_siswa cs
    INNER JOIN edukator e ON e.id = cs.edukator_id
    INNER JOIN siswa s ON s.id = cs.siswa_id
    LEFT JOIN enrollment en ON en.id = cs.enrollment_id
    LEFT JOIN program pr ON pr.id = en.program_id
    LEFT JOIN jadwal j ON j.id = cs.jadwal_id
    WHERE cs.id = ?`,
    [id]
  );

  return rows[0] || null;
};

const createCatatan = async (payload, edukatorId) => {
  const {
    siswa_id,
    enrollment_id,
    jadwal_id,
    tanggal,
    catatan,
    kategori
  } = payload;

  const [siswa] = await db.query("SELECT id FROM siswa WHERE id = ?", [siswa_id]);
  if (!siswa || siswa.length === 0) {
    throw new Error("Siswa tidak ditemukan");
  }

  const [teachesThisStudent] = await db.query(
    `SELECT j.id
    FROM jadwal j
    INNER JOIN enrollment en ON en.id = j.enrollment_id
    WHERE j.edukator_id = ? AND en.siswa_id = ?
    LIMIT 1`,
    [edukatorId, siswa_id]
  );

  if (!teachesThisStudent || teachesThisStudent.length === 0) {
    throw new Error("Anda tidak mengajar siswa ini");
  }

  const [result] = await db.query(
    `INSERT INTO catatan_siswa
      (edukator_id, siswa_id, enrollment_id, jadwal_id, tanggal, catatan, kategori)
    VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      edukatorId,
      siswa_id,
      enrollment_id || null,
      jadwal_id || null,
      tanggal,
      catatan,
      kategori || "umum"
    ]
  );

  return { id: result.insertId };
};

const updateCatatan = async (id, payload, edukatorId) => {
  const existing = await getCatatanById(id);
  if (!existing) {
    throw new Error("Catatan tidak ditemukan");
  }

  if (existing.edukator_id !== edukatorId) {
    throw new Error("Anda tidak memiliki akses untuk mengubah catatan ini");
  }

  await db.query(
    `UPDATE catatan_siswa
    SET catatan = ?, kategori = ?
    WHERE id = ?`,
    [payload.catatan || existing.catatan, payload.kategori || existing.kategori, id]
  );
};

const deleteCatatan = async (id, edukatorId) => {
  const existing = await getCatatanById(id);
  if (!existing) {
    throw new Error("Catatan tidak ditemukan");
  }

  if (existing.edukator_id !== edukatorId) {
    throw new Error("Anda tidak memiliki akses untuk menghapus catatan ini");
  }

  await db.query("DELETE FROM catatan_siswa WHERE id = ?", [id]);
};

module.exports = {
  listStudentsByEdukator,
  listNotesBySiswa,
  getCatatanById,
  createCatatan,
  updateCatatan,
  deleteCatatan,
};
