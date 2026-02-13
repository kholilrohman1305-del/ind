const db = require("../db");

const JENJANG_OPTIONS = ["PAUD_TK", "SD", "SMP", "SMA", "ALUMNI"];

// Get mapel list for a program
const getProgramMapel = async (programId, conn = db) => {
  const [rows] = await conn.query(
    `SELECT m.id, m.nama
     FROM program_mapel pm
     JOIN mapel m ON m.id = pm.mapel_id
     WHERE pm.program_id = ?
     ORDER BY m.nama ASC`,
    [programId]
  );
  return rows;
};

// Format mapel names as comma-separated string
const formatMapelNames = (mapelList) => {
  if (!mapelList || !mapelList.length) return "-";
  return mapelList.map(m => m.nama).join(", ");
};

// Sync program_mapel junction table
const syncProgramMapel = async (conn, programId, mapelIds) => {
  // Delete existing
  await conn.query("DELETE FROM program_mapel WHERE program_id = ?", [programId]);

  // Insert new
  if (mapelIds && mapelIds.length > 0) {
    const values = mapelIds.map(mapelId => [programId, Number(mapelId)]);
    await conn.query(
      "INSERT INTO program_mapel (program_id, mapel_id) VALUES ?",
      [values]
    );
  }
};

const listProgram = async (cabangId) => {
  let rows;
  if (cabangId) {
    [rows] = await db.query(
      `SELECT p.id, p.cabang_id, p.jenjang, p.mapel_id, p.nama, p.tipe_les, p.tarif_id,
              p.jumlah_pertemuan, p.harga, p.gaji_per_pertemuan, p.transport_edukator,
              p.transport_ilhami, p.tarif_tidak_hadir, p.deskripsi, p.gambar, p.is_active, p.created_at,
              gs.nama_tarif, gs.kategori_les
       FROM program p
       LEFT JOIN gaji_setting gs ON gs.id = p.tarif_id
       WHERE p.cabang_id = ?
       ORDER BY p.created_at DESC`,
      [cabangId]
    );
  } else {
    [rows] = await db.query(
      `SELECT p.id, p.cabang_id, p.jenjang, p.mapel_id, p.nama, p.tipe_les, p.tarif_id,
              p.jumlah_pertemuan, p.harga, p.gaji_per_pertemuan, p.transport_edukator,
              p.transport_ilhami, p.tarif_tidak_hadir, p.deskripsi, p.gambar, p.is_active, p.created_at,
              gs.nama_tarif, gs.kategori_les
       FROM program p
       LEFT JOIN gaji_setting gs ON gs.id = p.tarif_id
       ORDER BY p.created_at DESC`
    );
  }

  // Fetch mapel for each program
  for (const row of rows) {
    const mapelList = await getProgramMapel(row.id);
    row.mapel_list = mapelList;
    row.mapel_ids = mapelList.map(m => m.id);
    row.mapel_nama = formatMapelNames(mapelList);
  }

  return rows;
};

const getProgramById = async (id) => {
  const [rows] = await db.query(
    `SELECT p.id, p.cabang_id, p.jenjang, p.mapel_id, p.nama, p.tipe_les, p.tarif_id,
            p.jumlah_pertemuan, p.harga, p.gaji_per_pertemuan, p.transport_edukator,
            p.transport_ilhami, p.tarif_tidak_hadir, p.deskripsi, p.is_active, p.created_at,
            gs.nama_tarif, gs.kategori_les
     FROM program p
     LEFT JOIN gaji_setting gs ON gs.id = p.tarif_id
     WHERE p.id = ?`,
    [id]
  );

  const program = rows[0] || null;
  if (program) {
    const mapelList = await getProgramMapel(program.id);
    program.mapel_list = mapelList;
    program.mapel_ids = mapelList.map(m => m.id);
    program.mapel_nama = formatMapelNames(mapelList);
  }

  return program;
};

const createProgram = async (payload) => {
  const {
    cabang_id,
    jenjang,
    mapel_ids,
    nama,
    tipe_les,
    tarif_id,
    jumlah_pertemuan,
    harga,
    gaji_per_pertemuan,
    transport_edukator,
    transport_ilhami,
    tarif_tidak_hadir,
    deskripsi,
    gambar,
    is_active,
  } = payload;

  if (!nama || !tipe_les || typeof harga === "undefined") {
    throw new Error("Nama, tipe les, dan harga wajib diisi.");
  }

  const activeFlag = typeof is_active === "undefined" ? 1 : is_active ? 1 : 0;
  const pertemuanValue = jumlah_pertemuan ? Number(jumlah_pertemuan) : null;
  const jenjangValue = jenjang && JENJANG_OPTIONS.includes(jenjang) ? jenjang : null;
  const tarifIdValue = tarif_id ? Number(tarif_id) : null;
  const tarifTidakHadirValue = tarif_tidak_hadir ? Number(tarif_tidak_hadir) : 0;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    const [result] = await conn.query(
      `INSERT INTO program
        (cabang_id, jenjang, nama, tipe_les, tarif_id, jumlah_pertemuan, harga,
         gaji_per_pertemuan, transport_edukator, transport_ilhami, tarif_tidak_hadir, deskripsi, gambar, is_active)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        cabang_id,
        jenjangValue,
        nama,
        tipe_les,
        tarifIdValue,
        pertemuanValue,
        Number(harga),
        Number(gaji_per_pertemuan || 0),
        Number(transport_edukator || 0),
        Number(transport_ilhami || 0),
        tarifTidakHadirValue,
        deskripsi || null,
        gambar || null,
        activeFlag,
      ]
    );

    const programId = result.insertId;

    // Sync mapel
    if (mapel_ids && Array.isArray(mapel_ids) && mapel_ids.length > 0) {
      await syncProgramMapel(conn, programId, mapel_ids);
    }

    await conn.commit();
    return { id: programId };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const updateProgram = async (id, payload, existing) => {
  const pertemuanValue =
    typeof payload.jumlah_pertemuan !== "undefined"
      ? Number(payload.jumlah_pertemuan)
      : existing.jumlah_pertemuan;

  const activeFlag =
    typeof payload.is_active !== "undefined" ? (payload.is_active ? 1 : 0) : existing.is_active;

  const jenjangValue =
    typeof payload.jenjang !== "undefined"
      ? (JENJANG_OPTIONS.includes(payload.jenjang) ? payload.jenjang : null)
      : existing.jenjang;

  const tarifIdValue =
    typeof payload.tarif_id !== "undefined"
      ? (payload.tarif_id ? Number(payload.tarif_id) : null)
      : existing.tarif_id;

  const gajiPerPertemuan =
    typeof payload.gaji_per_pertemuan !== "undefined"
      ? Number(payload.gaji_per_pertemuan)
      : existing.gaji_per_pertemuan || 0;
  const transportEdukator =
    typeof payload.transport_edukator !== "undefined"
      ? Number(payload.transport_edukator)
      : existing.transport_edukator || 0;
  const transportIlhami =
    typeof payload.transport_ilhami !== "undefined"
      ? Number(payload.transport_ilhami)
      : existing.transport_ilhami || 0;
  const tarifTidakHadir =
    typeof payload.tarif_tidak_hadir !== "undefined"
      ? Number(payload.tarif_tidak_hadir)
      : existing.tarif_tidak_hadir || 0;

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();

    await conn.query(
      `UPDATE program SET
        jenjang = ?, nama = ?, tipe_les = ?, tarif_id = ?, jumlah_pertemuan = ?, harga = ?,
        gaji_per_pertemuan = ?, transport_edukator = ?, transport_ilhami = ?, tarif_tidak_hadir = ?,
        deskripsi = ?, gambar = ?, is_active = ?
       WHERE id = ?`,
      [
        jenjangValue,
        payload.nama || existing.nama,
        payload.tipe_les || existing.tipe_les,
        tarifIdValue,
        pertemuanValue || null,
        typeof payload.harga !== "undefined" ? Number(payload.harga) : existing.harga,
        gajiPerPertemuan,
        transportEdukator,
        transportIlhami,
        tarifTidakHadir,
        typeof payload.deskripsi !== "undefined" ? payload.deskripsi : existing.deskripsi,
        typeof payload.gambar !== "undefined" ? payload.gambar : existing.gambar || null,
        activeFlag,
        id,
      ]
    );

    // Sync mapel if provided
    if (typeof payload.mapel_ids !== "undefined") {
      await syncProgramMapel(conn, id, payload.mapel_ids || []);
    }

    await conn.commit();
    return { id };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

const deleteProgram = async (id) => {
  await db.query("DELETE FROM program WHERE id = ?", [id]);
};

module.exports = {
  listProgram,
  getProgramById,
  createProgram,
  updateProgram,
  deleteProgram,
  JENJANG_OPTIONS,
};
