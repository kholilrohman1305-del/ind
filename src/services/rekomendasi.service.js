const db = require("../db");
const { ENROLLMENT_STATUS } = require("../config/constants");

// Helper: Haversine Distance (Hitung jarak km antar koordinat)
const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371; // Radius bumi dalam km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const deg2rad = (deg) => deg * (Math.PI / 180);

const getRecommendations = async ({ cabangId, mapelId, jenjang, latSiswa, lngSiswa }) => {
  // 1. Ambil Kandidat (Edukator Aktif di Cabang yang mengajar Mapel tersebut)
  // Note: Kita ambil kolom latitude/longitude jika ada (asumsi future proofing), jika tidak ada di DB akan undefined/null
  const [candidates] = await db.query(
    `SELECT e.id, e.nama, e.alamat, e.pendidikan_terakhir,
            -- e.latitude, e.longitude, -- Uncomment jika kolom ini sudah ditambahkan ke tabel edukator
            (SELECT COUNT(*) FROM jadwal j
             JOIN enrollment en ON en.id = j.enrollment_id
             WHERE j.edukator_id = e.id AND en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}') as current_load
     FROM edukator e
     JOIN edukator_mapel em ON em.edukator_id = e.id
     WHERE e.cabang_utama_id = ? AND e.is_active = 1 AND em.mapel_id = ?`,
    [cabangId, mapelId]
  );

  if (!candidates.length) return [];

  // 2. Hitung Skor (Weighted Scoring)
  const scoredCandidates = await Promise.all(candidates.map(async (edu) => {
    let score = 0;
    const details = {};

    // A. Beban Kerja / Availability (Bobot: 30%)
    // Semakin sedikit siswa aktif, semakin tinggi skor.
    // Asumsi: Max load ideal adalah 20 siswa.
    const maxLoad = 20;
    const loadScore = Math.max(0, Math.min(30, (1 - (edu.current_load / maxLoad)) * 30));
    score += loadScore;
    details.load = { val: edu.current_load, score: Number(loadScore.toFixed(1)) };

    // B. Lokasi / Jarak (Bobot: 30%)
    // Jika koordinat tersedia, hitung jarak. Jika tidak, beri nilai tengah (netral).
    let distScore = 0;
    let distance = null;
    if (latSiswa && lngSiswa && edu.latitude && edu.longitude) {
        distance = getDistanceFromLatLonInKm(latSiswa, lngSiswa, edu.latitude, edu.longitude);
        // Semakin dekat semakin bagus. Max jarak toleransi 15km.
        if (distance <= 15) {
            distScore = (1 - (distance / 15)) * 30;
        }
    } else {
        // Skor netral jika data lokasi tidak lengkap
        distScore = 15; 
    }
    score += distScore;
    details.location = { distance: distance ? distance.toFixed(2) + ' km' : 'N/A', score: Number(distScore.toFixed(1)) };

    // C. Pengalaman Jenjang (Bobot: 20%)
    // Cek riwayat gaji/mengajar untuk jenjang yang diminta
    let jenjangScore = 5; // Base score (potensi)
    if (jenjang) {
        const [history] = await db.query(
            `SELECT COUNT(*) as count FROM gaji_transaksi
             WHERE edukator_id = ? AND jenjang = ?`,
            [edu.id, jenjang]
        );
        // Jika pernah mengajar jenjang ini, beri skor penuh
        if (history[0].count > 0) jenjangScore = 20;
    }
    score += jenjangScore;
    details.jenjang = { match: jenjangScore === 20, score: jenjangScore };

    // D. Tingkat Pendidikan (Bobot: 20%)
    // S2 > S1 > Mahasiswa
    let eduScore = 10;
    const eduLevel = edu.pendidikan_terakhir || "";
    if (eduLevel.includes('S2') || eduLevel.includes('Magister')) eduScore = 20;
    else if (eduLevel.includes('S1') || eduLevel.includes('Sarjana')) eduScore = 15;
    else if (eduLevel.includes('Mahasiswa')) eduScore = 10;
    
    score += eduScore;
    details.education = { level: eduLevel, score: eduScore };

    return {
        id: edu.id,
        nama: edu.nama,
        pendidikan: edu.pendidikan_terakhir,
        total_score: Math.round(score),
        details
    };
  }));

  // 3. Urutkan berdasarkan Skor Tertinggi
  return scoredCandidates.sort((a, b) => b.total_score - a.total_score);
};

module.exports = { getRecommendations };