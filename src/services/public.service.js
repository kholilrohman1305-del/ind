const db = require("../db");
const bcrypt = require("bcryptjs");
const { ROLES, PENDAFTARAN_STATUS } = require("../config/constants");

const getPublicPrograms = async () => {
  const [rows] = await db.query(`
    SELECT p.id, p.cabang_id, p.nama, p.jenjang, p.tipe_les, p.harga, p.deskripsi, p.gambar, p.jumlah_pertemuan,
           c.nama AS cabang_nama, c.alamat AS cabang_alamat, c.kode AS cabang_kode
    FROM program p
    JOIN cabang c ON c.id = p.cabang_id
    WHERE p.is_active = 1 AND c.is_active = 1
    ORDER BY p.created_at DESC
  `);
  return rows;
};

const getRegistrationOptions = async () => {
  const [cabang] = await db.query("SELECT id, nama FROM cabang WHERE is_active = 1 ORDER BY nama");
  const [program] = await db.query("SELECT id, nama, cabang_id, jenjang FROM program WHERE is_active = 1 ORDER BY nama");
  const [mapel] = await db.query("SELECT id, nama FROM mapel WHERE is_active = 1 ORDER BY nama");
  return { cabang, program, mapel };
};

const registerEdukator = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const { nama, email, password, telepon, alamat, cabang_id, pendidikan_terakhir, mapel_ids } = payload;

    // Check email
    const [existing] = await conn.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) throw new Error("Email sudah terdaftar.");

    const hashed = await bcrypt.hash(password, 10);
    
    // Create User (Inactive by default, waiting for approval)
    const [userRes] = await conn.query(
      `INSERT INTO users (email, password, role, cabang_id, is_active) VALUES (?, ?, '${ROLES.EDUKATOR}', ?, 0)`,
      [email, hashed, cabang_id]
    );

    const [eduRes] = await conn.query(
      "INSERT INTO edukator (user_id, cabang_utama_id, nama, telepon, alamat, pendidikan_terakhir, is_active) VALUES (?, ?, ?, ?, ?, ?, 0)",
      [userRes.insertId, cabang_id, nama, telepon, alamat, pendidikan_terakhir]
    );

    // Insert Mapel
    if (mapel_ids && Array.isArray(mapel_ids) && mapel_ids.length > 0) {
      const values = mapel_ids.map(mid => [eduRes.insertId, mid]);
      await conn.query("INSERT INTO edukator_mapel (edukator_id, mapel_id) VALUES ?", [values]);
    }

    await conn.commit();
    return { success: true };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const registerSiswa = async (payload) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const {
      nama, email, password, telepon, alamat,
      cabang_id, jenjang, sekolah_asal, kelas, tanggal_lahir,
      program_id,          // Program selected from landing page (optional)
      mapel_ids,           // Array of mapel IDs (optional if program_id exists)
      preferred_days,      // Array of day names
      jam_belajar,         // Format: "HH:MM-HH:MM"
      tanggal_mulai_belajar
    } = payload;

    // Validate required fields
    if (!nama || !email || !password) {
      throw new Error("Nama, email, dan password wajib diisi.");
    }
    if (!cabang_id) {
      throw new Error("Pilih cabang terlebih dahulu.");
    }
    // Program wajib dipilih
    const hasProgram = program_id && program_id !== "null" && program_id !== "";
    if (!hasProgram) {
      throw new Error("Pilih program terlebih dahulu.");
    }
    if (!preferred_days || !Array.isArray(preferred_days) || preferred_days.length === 0) {
      throw new Error("Pilih minimal satu hari belajar.");
    }
    if (!jam_belajar) {
      throw new Error("Pilih jam belajar.");
    }
    if (!tanggal_mulai_belajar) {
      throw new Error("Pilih tanggal mulai belajar.");
    }

    // Check if email already exists
    const [existing] = await conn.query("SELECT id FROM users WHERE email = ?", [email]);
    if (existing.length > 0) {
      throw new Error("Email sudah terdaftar.");
    }

    // Parse jam_belajar (format: "HH:MM-HH:MM")
    const [jam_mulai, jam_selesai] = jam_belajar.split("-");

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // 1. Create user with is_active = 0 (pending, cannot login)
    const [userRes] = await conn.query(
      `INSERT INTO users (email, password, role, cabang_id, is_active)
       VALUES (?, ?, '${ROLES.SISWA}', ?, 0)`,
      [email, hashed, cabang_id]
    );

    // 2. Create siswa with status_pendaftaran = 'pending'
    const [siswaRes] = await conn.query(
      `INSERT INTO siswa
        (user_id, cabang_id, nama, telepon, alamat, tanggal_lahir,
         sekolah_asal, jenjang, kelas, is_active, status_pendaftaran,
         program_id, tanggal_mulai_belajar, preferred_days, preferred_jam_mulai, preferred_jam_selesai)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, '${PENDAFTARAN_STATUS.PENDING}', ?, ?, ?, ?, ?)`,
      [
        userRes.insertId,
        cabang_id,
        nama,
        telepon || null,
        alamat || null,
        tanggal_lahir || null,
        sekolah_asal || null,
        jenjang || null,
        kelas || null,
        hasProgram ? program_id : null,
        tanggal_mulai_belajar,
        JSON.stringify(preferred_days),
        jam_mulai,
        jam_selesai
      ]
    );

    // 3. Insert siswa_mapel junction records
    // Mapel mengikuti program (untuk kebutuhan penjadwalan), bukan membuat program baru.
    let mapelIdsToInsert = [];
    const [progRows] = await conn.query(
      "SELECT mapel_id FROM program WHERE id = ?",
      [program_id]
    );
    if (progRows[0]?.mapel_id) {
      mapelIdsToInsert.push(progRows[0].mapel_id);
    } else if (mapel_ids && Array.isArray(mapel_ids) && mapel_ids.length > 0) {
      // Fallback jika program belum punya mapel_id
      mapel_ids.forEach((mid) => {
        if (!mapelIdsToInsert.includes(Number(mid))) {
          mapelIdsToInsert.push(Number(mid));
        }
      });
    }

    if (mapelIdsToInsert.length > 0) {
      const mapelValues = mapelIdsToInsert.map(mid => [siswaRes.insertId, mid]);
      await conn.query(
        `INSERT INTO siswa_mapel (siswa_id, mapel_id) VALUES ?`,
        [mapelValues]
      );
    }

    await conn.commit();
    return { success: true, siswa_id: siswaRes.insertId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const getActiveBanners = async () => {
  const [rows] = await db.query(
    "SELECT id, gambar, judul, link_url FROM banner WHERE is_active = 1 ORDER BY urutan ASC, id ASC"
  );
  return rows;
};

const getFeaturedEdukators = async () => {
  const [rows] = await db.query(`
    SELECT e.id, e.nama, e.pendidikan_terakhir, e.foto,
           GROUP_CONCAT(m.nama SEPARATOR ', ') AS mapel_nama,
           c.nama AS cabang_nama
    FROM edukator e
    LEFT JOIN edukator_mapel em ON em.edukator_id = e.id
    LEFT JOIN mapel m ON m.id = em.mapel_id
    LEFT JOIN cabang c ON c.id = e.cabang_utama_id
    WHERE e.is_active = 1
    GROUP BY e.id
    ORDER BY e.created_at DESC
    LIMIT 8
  `);
  return rows;
};

module.exports = { getPublicPrograms, getRegistrationOptions, registerEdukator, registerSiswa, getActiveBanners, getFeaturedEdukators };
