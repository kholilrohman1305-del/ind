const bcrypt = require("bcryptjs");
const db = require("../db");
const { ROLES } = require("../config/constants");

const listCabang = async () => {
  const [rows] = await db.query(
    `SELECT id, kode, nama, alamat, telepon, latitude, longitude, tanggal_jatuh_tempo,
            is_active, created_at
     FROM cabang
     ORDER BY created_at DESC`
  );
  return rows;
};

const deg2rad = (deg) => (deg * Math.PI) / 180;
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  if (
    lat1 === null ||
    lon1 === null ||
    lat2 === null ||
    lon2 === null ||
    typeof lat1 === "undefined" ||
    typeof lon1 === "undefined" ||
    typeof lat2 === "undefined" ||
    typeof lon2 === "undefined"
  ) {
    return null;
  }
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) *
      Math.cos(deg2rad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return 6371 * c;
};

const kMeans = (points, k, maxIter = 25) => {
  if (!points.length) return [];
  const centers = [];
  const used = new Set();
  while (centers.length < k) {
    const idx = Math.floor(Math.random() * points.length);
    if (used.has(idx)) continue;
    used.add(idx);
    centers.push({ lat: points[idx].lat, lng: points[idx].lng });
  }

  for (let iter = 0; iter < maxIter; iter += 1) {
    const clusters = Array.from({ length: k }, () => []);
    points.forEach((p) => {
      let bestIdx = 0;
      let bestDist = Infinity;
      centers.forEach((c, idx) => {
        const dist = getDistanceKm(p.lat, p.lng, c.lat, c.lng);
        if (dist !== null && dist < bestDist) {
          bestDist = dist;
          bestIdx = idx;
        }
      });
      clusters[bestIdx].push(p);
    });

    let moved = false;
    clusters.forEach((cluster, idx) => {
      if (!cluster.length) return;
      const avgLat = cluster.reduce((sum, p) => sum + p.lat, 0) / cluster.length;
      const avgLng = cluster.reduce((sum, p) => sum + p.lng, 0) / cluster.length;
      const dist = getDistanceKm(avgLat, avgLng, centers[idx].lat, centers[idx].lng);
      if (dist && dist > 0.001) moved = true;
      centers[idx] = { lat: avgLat, lng: avgLng };
    });

    if (!moved) break;
  }

  return centers;
};

const getCabangById = async (id) => {
  const [rows] = await db.query(
    `SELECT id, kode, nama, alamat, telepon, latitude, longitude, tanggal_jatuh_tempo,
            is_active, created_at
     FROM cabang
     WHERE id = ?`,
    [id]
  );
  return rows[0] || null;
};

const createCabang = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      kode,
      nama,
      alamat,
      telepon,
      latitude,
      longitude,
      tanggal_jatuh_tempo,
      is_active,
      admin_email,
      admin_password,
    } = payload;

    if (!kode || !nama) {
      throw new Error("Kode dan nama cabang wajib diisi.");
    }

    const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;

    const [cabangRes] = await conn.query(
      `INSERT INTO cabang
        (kode, nama, alamat, telepon, latitude, longitude, tanggal_jatuh_tempo, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        kode,
        nama,
        alamat || null,
        telepon || null,
        latitude || null,
        longitude || null,
        tanggal_jatuh_tempo || 10,
        activeFlag,
      ]
    );

    const cabangId = cabangRes.insertId;
    let userId = null;

    if (admin_email && admin_password) {
      const [dupeRows] = await conn.query(
        "SELECT id FROM users WHERE email = ? LIMIT 1",
        [admin_email]
      );
      if (dupeRows.length) {
        throw new Error("Email admin sudah digunakan.");
      }
      const hashed = await bcrypt.hash(String(admin_password), 10);
      const [userRes] = await conn.query(
        `INSERT INTO users (email, password, role, cabang_id, is_active)
         VALUES (?, ?, '${ROLES.ADMIN_CABANG}', ?, 1)`,
        [admin_email, hashed, cabangId]
      );
      userId = userRes.insertId;
    }

    await conn.commit();
    return { id: cabangId, user_id: userId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateCabang = async (id, payload, existing) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE cabang SET
        kode = ?, nama = ?, alamat = ?, telepon = ?, latitude = ?, longitude = ?,
        tanggal_jatuh_tempo = ?, is_active = ?
       WHERE id = ?`,
      [
        payload.kode || existing.kode,
        payload.nama || existing.nama,
        typeof payload.alamat !== "undefined" ? payload.alamat : existing.alamat,
        typeof payload.telepon !== "undefined" ? payload.telepon : existing.telepon,
        typeof payload.latitude !== "undefined" ? payload.latitude : existing.latitude,
        typeof payload.longitude !== "undefined" ? payload.longitude : existing.longitude,
        typeof payload.tanggal_jatuh_tempo !== "undefined"
          ? payload.tanggal_jatuh_tempo
          : existing.tanggal_jatuh_tempo,
        typeof payload.is_active !== "undefined"
          ? payload.is_active
            ? 1
            : 0
          : existing.is_active,
        id,
      ]
    );

    const adminEmail = (payload.admin_email || "").trim();
    const adminPassword = payload.admin_password || "";

    if (adminEmail || adminPassword) {
      const [adminRows] = await conn.query(
        `SELECT id, email FROM users WHERE role = '${ROLES.ADMIN_CABANG}' AND cabang_id = ? LIMIT 1`,
        [id]
      );
      const admin = adminRows[0] || null;

      if (adminEmail) {
        const [dupeRows] = await conn.query(
          "SELECT id FROM users WHERE email = ? AND id <> ? LIMIT 1",
          [adminEmail, admin ? admin.id : 0]
        );
        if (dupeRows.length) {
          throw new Error("Email admin sudah digunakan.");
        }
      }

      if (!admin) {
        if (!adminEmail || !adminPassword) {
          throw new Error("Email dan password admin wajib diisi.");
        }
        const hashed = await bcrypt.hash(String(adminPassword), 10);
        await conn.query(
          `INSERT INTO users (email, password, role, cabang_id, is_active)
           VALUES (?, ?, '${ROLES.ADMIN_CABANG}', ?, 1)`,
          [adminEmail, hashed, id]
        );
      } else {
        const updates = [];
        const params = [];
        if (adminEmail) {
          updates.push("email = ?");
          params.push(adminEmail);
        }
        if (adminPassword) {
          const hashed = await bcrypt.hash(String(adminPassword), 10);
          updates.push("password = ?");
          params.push(hashed);
        }
        if (updates.length) {
          params.push(admin.id);
          await conn.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
        }
      }
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const deleteCabang = async (id) => {
  await db.query("DELETE FROM cabang WHERE id = ?", [id]);
};

const getCabangRecommendations = async ({ months = 6, k = 3, radiusKm = 3 } = {}) => {
  const safeMonths = Math.max(1, Number(months || 6));
  const safeK = Math.max(1, Number(k || 3));
  const safeRadius = Math.max(1, Number(radiusKm || 3));

  const [cabangRows] = await db.query(
    `SELECT id, nama, latitude, longitude
     FROM cabang
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL AND is_active = 1`
  );

  const [presensiRows] = await db.query(
    `SELECT latitude, longitude
     FROM presensi
     WHERE latitude IS NOT NULL AND longitude IS NOT NULL
       AND waktu_absen >= DATE_SUB(NOW(), INTERVAL ? MONTH)`,
    [safeMonths]
  );

  const points = (presensiRows || [])
    .map((row) => ({
      lat: Number(row.latitude),
      lng: Number(row.longitude),
    }))
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng));

  if (points.length < 5) {
    return [];
  }

  const centers = kMeans(points, Math.min(safeK, points.length));

  const recommendations = centers.map((center) => {
    const coverage = points.filter((p) => {
      const dist = getDistanceKm(p.lat, p.lng, center.lat, center.lng);
      return dist !== null && dist <= safeRadius;
    }).length;

    let minDist = null;
    let nearestCabang = null;
    cabangRows.forEach((cabang) => {
      const dist = getDistanceKm(center.lat, center.lng, cabang.latitude, cabang.longitude);
      if (dist === null) return;
      if (minDist === null || dist < minDist) {
        minDist = dist;
        nearestCabang = cabang;
      }
    });

    const separationScore = minDist ? Math.min(minDist, safeRadius * 3) / safeRadius : 0;
    const score = coverage + separationScore;

    return {
      lat: center.lat,
      lng: center.lng,
      coverage,
      nearest_cabang: nearestCabang ? nearestCabang.nama : null,
      nearest_distance_km: minDist ? Number(minDist.toFixed(2)) : null,
      score: Number(score.toFixed(2)),
    };
  });

  return recommendations.sort((a, b) => b.score - a.score).slice(0, safeK);
};

module.exports = {
  listCabang,
  getCabangById,
  createCabang,
  updateCabang,
  deleteCabang,
  getCabangRecommendations,
};
