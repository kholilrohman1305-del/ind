const db = require("../db");
const notifikasiService = require("./notifikasi.service");
const { ROLES, TIPE_LES, PRESENSI_STATUS } = require("../config/constants");

const JENJANGS = ["PAUD_TK", "SD", "SMP", "SMA", "ALUMNI"];
const KLASIFIKASI_EDUKATOR = ["Mahasiswa", "Sarjana", "Sarjana_Manajemen"];

// Helper: Check if period is current or past (not future)
// Management salary only counts for periods that have started
const isPeriodStarted = (year, month) => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const targetYear = Number(year);
  const targetMonth = Number(month);

  // Future year
  if (targetYear > currentYear) return false;
  // Same year, future month
  if (targetYear === currentYear && targetMonth > currentMonth) return false;

  return true;
};

// Get all tipe_les from database
const listTipeLes = async (cabangId) => {
  const [rows] = await db.query(
    `SELECT id, kode, nama, deskripsi, urutan, is_active
     FROM tipe_les
     WHERE (cabang_id IS NULL OR cabang_id = ?) AND is_active = 1
     ORDER BY urutan ASC, nama ASC`,
    [cabangId || null]
  );
  return rows;
};

// Create new tipe_les
const createTipeLes = async (payload, cabangId) => {
  const { kode, nama, deskripsi } = payload;

  if (!kode || !nama) {
    throw new Error("Kode dan nama tipe les wajib diisi.");
  }

  // Get max urutan
  const [[maxRow]] = await db.query(
    `SELECT MAX(urutan) as max_urutan FROM tipe_les WHERE cabang_id <=> ?`,
    [cabangId || null]
  );
  const urutan = (maxRow?.max_urutan || 0) + 1;

  const [result] = await db.query(
    `INSERT INTO tipe_les (cabang_id, kode, nama, deskripsi, urutan)
     VALUES (?, ?, ?, ?, ?)`,
    [cabangId || null, kode.toLowerCase().replace(/\s+/g, '_'), nama, deskripsi || null, urutan]
  );

  return { id: result.insertId, kode, nama };
};

// Delete tipe_les
const deleteTipeLes = async (id) => {
  // Check if tipe_les is in use
  const [[usageCheck]] = await db.query(
    `SELECT COUNT(*) as count FROM program WHERE tipe_les = (SELECT kode FROM tipe_les WHERE id = ?)`,
    [id]
  );
  if (usageCheck?.count > 0) {
    throw new Error("Tipe les masih digunakan di program. Tidak bisa dihapus.");
  }

  await db.query("DELETE FROM tipe_les WHERE id = ?", [id]);
  return { success: true };
};

// Map edukator.pendidikan_terakhir + manajemen_id to klasifikasi_edukator
const getKlasifikasiEdukator = (pendidikanTerakhir, hasManajemen) => {
  // Jika Sarjana (S1/S2) dan punya manajemen, gunakan Sarjana_Manajemen
  if (hasManajemen) {
    const pendidikan = String(pendidikanTerakhir || "").trim();
    if (pendidikan === "S1" || pendidikan === "S2" || pendidikan === "Sarjana" || pendidikan === "Magister") {
      return "Sarjana_Manajemen";
    }
  }

  const trimmed = String(pendidikanTerakhir || "").trim();
  if (trimmed === "Mahasiswa") return "Mahasiswa";
  if (trimmed === "S1" || trimmed === "S2" || trimmed === "Sarjana" || trimmed === "Magister") return "Sarjana";

  // Default to Mahasiswa if unknown
  return "Mahasiswa";
};

const normalizeJenjang = (value) => {
  if (!value) return null;
  const upper = String(value).trim().toUpperCase();
  if (upper === "PAUD_TK" || upper === "PAUD" || upper === "TK") return "PAUD_TK";
  if (upper === "SD") return "SD";
  if (upper === "SMP") return "SMP";
  if (upper === "SMA") return "SMA";
  if (upper === "ALUMNI") return "ALUMNI";
  // Fallback parsing for legacy data
  if (upper.includes("PAUD") || upper.includes("TK")) return "PAUD_TK";
  if (upper.includes("SD") || upper.includes("SEKOLAH DASAR")) return "SD";
  if (upper.includes("SMP") || upper.includes("TSANAWIYAH")) return "SMP";
  if (upper.includes("SMA") || upper.includes("SMK") || upper.includes("ALIYAH")) return "SMA";
  if (upper.includes("ALUMNI")) return "ALUMNI";
  return null;
};

// List all tarif settings
const listSetting = async (cabangId) => {
  const params = [];
  let where = "";
  if (cabangId) {
    where = "WHERE cabang_id = ?";
    params.push(cabangId);
  } else {
    where = "WHERE cabang_id IS NULL";
  }
  const [rows] = await db.query(
    `SELECT id, nama_tarif, kategori_les, jenjang, klasifikasi_edukator, nominal, updated_at
     FROM gaji_setting
     ${where}
     ORDER BY
       nama_tarif ASC,
       FIELD(kategori_les, 'privat', 'kelas'),
       FIELD(jenjang, 'PAUD_TK', 'SD', 'SMP', 'SMA', 'ALUMNI'),
       FIELD(klasifikasi_edukator, 'Mahasiswa', 'Sarjana', 'Sarjana_Manajemen')`,
    params
  );
  return rows;
};

// List unique tarif names grouped by kategori
const listTarifNames = async (cabangId) => {
  const params = [];
  let where = "";
  if (cabangId) {
    where = "WHERE cabang_id = ?";
    params.push(cabangId);
  } else {
    where = "WHERE cabang_id IS NULL";
  }
  const [rows] = await db.query(
    `SELECT DISTINCT nama_tarif, kategori_les
     FROM gaji_setting
     ${where}
     ORDER BY kategori_les ASC, nama_tarif ASC`,
    params
  );
  return rows;
};

// List tarif options for program selection (grouped by nama_tarif + kategori)
const listTarifForProgram = async (cabangId, kategoriLes) => {
  const params = [];
  let where = "WHERE 1=1";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  } else {
    where += " AND cabang_id IS NULL";
  }
  if (kategoriLes) {
    where += " AND kategori_les = ?";
    params.push(kategoriLes);
  }

  // Return distinct nama_tarif with MIN(id) as representative id for this tarif group
  const [rows] = await db.query(
    `SELECT MIN(id) AS id, nama_tarif, kategori_les,
            GROUP_CONCAT(DISTINCT jenjang ORDER BY FIELD(jenjang, 'PAUD_TK', 'SD', 'SMP', 'SMA', 'ALUMNI')) AS jenjangs
     FROM gaji_setting
     ${where}
     GROUP BY nama_tarif, kategori_les
     ORDER BY kategori_les ASC, nama_tarif ASC`,
    params
  );
  return rows;
};

// Save tarif for a specific nama_tarif + kategori_les (all jenjang x klasifikasi combinations)
const saveSetting = async (payload, cabangId) => {
  const namaTarif = payload.nama_tarif;
  const kategoriLes = payload.kategori_les;

  if (!namaTarif) {
    throw new Error("Nama tarif wajib diisi.");
  }
  if (!kategoriLes || !["privat", "kelas"].includes(kategoriLes)) {
    throw new Error("Kategori les harus 'privat' atau 'kelas'.");
  }

  const values = [];

  // payload structure: { nama_tarif, kategori_les, PAUD_TK_Mahasiswa, PAUD_TK_Sarjana, ... }
  JENJANGS.forEach((jenjang) => {
    KLASIFIKASI_EDUKATOR.forEach((klasifikasi) => {
      const key = `${jenjang}_${klasifikasi}`;
      const nominalRaw = payload[key];
      const nominal = Number(nominalRaw || 0);
      values.push([
        cabangId || null,
        namaTarif,
        kategoriLes,
        kategoriLes, // tipe_les = kategori_les for backward compatibility
        jenjang,
        klasifikasi,
        Number.isFinite(nominal) ? nominal : 0
      ]);
    });
  });

  await db.query(
    `INSERT INTO gaji_setting (cabang_id, nama_tarif, kategori_les, tipe_les, jenjang, klasifikasi_edukator, nominal)
     VALUES ?
     ON DUPLICATE KEY UPDATE nominal = VALUES(nominal), updated_at = CURRENT_TIMESTAMP`,
    [values]
  );

  return listSetting(cabangId);
};

// Delete tarif by nama_tarif + kategori_les
const deleteTarif = async (namaTarif, kategoriLes, cabangId) => {
  if (!namaTarif || !kategoriLes) {
    throw new Error("Nama tarif dan kategori les wajib diisi.");
  }

  await db.query(
    `DELETE FROM gaji_setting
     WHERE nama_tarif = ? AND kategori_les = ? AND cabang_id <=> ?`,
    [namaTarif, kategoriLes, cabangId || null]
  );

  return { success: true };
};

// Get jenjang from siswa.jenjang field (new) or fallback to parsing kelas (legacy)
const getJenjangFromJadwal = async (connection, jadwal) => {
  if (jadwal.enrollment_id) {
    const [rows] = await connection.query(
      `SELECT s.jenjang, s.kelas
       FROM enrollment en
       JOIN siswa s ON s.id = en.siswa_id
       WHERE en.id = ? LIMIT 1`,
      [jadwal.enrollment_id]
    );
    const siswa = rows[0];
    if (siswa?.jenjang) return siswa.jenjang;
    return normalizeJenjang(siswa?.kelas);
  }

  // For kelas jadwal, get from first siswa
  const [rows] = await connection.query(
    `SELECT s.jenjang, s.kelas
     FROM jadwal_kelas_siswa jks
     JOIN enrollment en ON en.id = jks.enrollment_id
     JOIN siswa s ON s.id = en.siswa_id
     WHERE jks.jadwal_id = ?
     ORDER BY jks.id ASC
     LIMIT 1`,
    [jadwal.id]
  );
  const siswa = rows[0];
  if (siswa?.jenjang) return siswa.jenjang;
  return normalizeJenjang(siswa?.kelas);
};

// Get edukator info (pendidikan_terakhir and manajemen_id)
const getEdukatorInfo = async (connection, edukatorId) => {
  if (!edukatorId) return { pendidikan_terakhir: null, manajemen_id: null };
  const [rows] = await connection.query(
    `SELECT pendidikan_terakhir, manajemen_id FROM edukator WHERE id = ? LIMIT 1`,
    [edukatorId]
  );
  return rows[0] || { pendidikan_terakhir: null, manajemen_id: null };
};

// Get tarif nominal based on nama_tarif + kategori_les + jenjang + klasifikasi_edukator
// Or by tarif_id from program
const getSettingNominal = async (connection, cabangId, tipeLes, jenjang, klasifikasiEdukator, namaTarif = null) => {
  if (!jenjang || !klasifikasiEdukator) return 0;

  // If namaTarif is provided, use it with kategori_les
  if (namaTarif) {
    const kategori = tipeLes || "privat";
    const [rows] = await connection.query(
      `SELECT nominal
       FROM gaji_setting
       WHERE cabang_id <=> ? AND nama_tarif = ? AND kategori_les = ? AND jenjang = ? AND klasifikasi_edukator = ?
       LIMIT 1`,
      [cabangId || null, namaTarif, kategori, jenjang, klasifikasiEdukator]
    );
    if (rows.length > 0) {
      return Number(rows[0].nominal || 0);
    }
  }

  // Fallback: try with tipe_les directly (backward compatibility)
  const tipe = tipeLes || "privat";
  const [rows] = await connection.query(
    `SELECT nominal
     FROM gaji_setting
     WHERE cabang_id <=> ? AND kategori_les = ? AND jenjang = ? AND klasifikasi_edukator = ?
     ORDER BY nama_tarif = 'Reguler' DESC
     LIMIT 1`,
    [cabangId || null, tipe, jenjang, klasifikasiEdukator]
  );
  return Number(rows[0]?.nominal || 0);
};

// Get tarif info from program's tarif_id
const getTarifFromProgram = async (connection, programId) => {
  if (!programId) return null;
  const [rows] = await connection.query(
    `SELECT p.tarif_id, g.nama_tarif, g.kategori_les
     FROM program p
     LEFT JOIN gaji_setting g ON g.id = p.tarif_id
     WHERE p.id = ?
     LIMIT 1`,
    [programId]
  );
  return rows[0] || null;
};

// Get program data from jadwal (for both privat and kelas)
const getProgramDataFromJadwal = async (connection, jadwal) => {
  // For privat jadwal with enrollment_id
  if (jadwal.enrollment_id) {
    const [rows] = await connection.query(
      `SELECT p.id AS program_id, p.gaji_per_pertemuan, p.transport_edukator, p.transport_ilhami,
              p.tipe_les, p.tarif_id, p.tarif_tidak_hadir, g.nama_tarif, g.kategori_les
       FROM enrollment en
       JOIN program p ON p.id = en.program_id
       LEFT JOIN gaji_setting g ON g.id = p.tarif_id
       WHERE en.id = ? LIMIT 1`,
      [jadwal.enrollment_id]
    );
    return rows[0] || null;
  }

  // For kelas jadwal, get program from first enrollment in jadwal_kelas_siswa
  const [rows] = await connection.query(
    `SELECT p.id AS program_id, p.gaji_per_pertemuan, p.transport_edukator, p.transport_ilhami,
            p.tipe_les, p.tarif_id, p.tarif_tidak_hadir, g.nama_tarif, g.kategori_les
     FROM jadwal_kelas_siswa jks
     JOIN enrollment en ON en.id = jks.enrollment_id
     JOIN program p ON p.id = en.program_id
     LEFT JOIN gaji_setting g ON g.id = p.tarif_id
     WHERE jks.jadwal_id = ?
     ORDER BY jks.id ASC
     LIMIT 1`,
    [jadwal.id]
  );
  return rows[0] || null;
};

const createTransaksiFromPresensi = async (connection, presensiId, jadwal, cabangId) => {
  const jenjang = await getJenjangFromJadwal(connection, jadwal);
  const tipeLes = jadwal.tipe_les || "privat";

  // Get edukator's klasifikasi
  const edukatorInfo = await getEdukatorInfo(connection, jadwal.edukator_id);
  const klasifikasiEdukator = getKlasifikasiEdukator(
    edukatorInfo.pendidikan_terakhir,
    !!edukatorInfo.manajemen_id
  );

  // Ambil data program (termasuk tarif info)
  const programData = await getProgramDataFromJadwal(connection, jadwal);

  // Ambil gaji dari tarif yang terhubung ke program (jika ada)
  // Jika program punya tarif_id, gunakan nama_tarif dari situ
  const namaTarif = programData?.nama_tarif || null;
  let nominal = await getSettingNominal(connection, cabangId, tipeLes, jenjang, klasifikasiEdukator, namaTarif);

  // For kelas: check if any students are present
  // If no students present, use tarif_tidak_hadir instead
  if (tipeLes === TIPE_LES.KELAS && programData?.tarif_tidak_hadir) {
    const [attendanceCount] = await connection.query(
      `SELECT COUNT(*) as hadir_count FROM presensi_siswa
       WHERE presensi_id = ? AND status_presensi_siswa = '${PRESENSI_STATUS.HADIR}'`,
      [presensiId]
    );
    const hadirCount = attendanceCount[0]?.hadir_count || 0;

    if (hadirCount === 0) {
      // No students present - use tarif_tidak_hadir
      nominal = Number(programData.tarif_tidak_hadir || 0);
    }
  }

  // Ambil transport dari program (jika ada)
  let transportEdukator = 0;
  let transportIlhami = 0;
  if (programData) {
    transportEdukator = Number(programData.transport_edukator || 0);
    transportIlhami = Number(programData.transport_ilhami || 0);
  }

  // Total gaji edukator = tarif dari setting + transport edukator dari program
  nominal = nominal + transportEdukator;

  if (!jenjang) {
    console.warn(`[Penggajian] Jenjang tidak ditemukan untuk jadwal ${jadwal.id}`);
    return { jenjang: null, nominal: 0, klasifikasi: klasifikasiEdukator };
  }

  // Insert gaji transaksi (store transport separately for breakdown display)
  await connection.query(
    `INSERT IGNORE INTO gaji_transaksi
      (presensi_id, jadwal_id, edukator_id, cabang_id, jenjang, nominal, transport_edukator)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [presensiId, jadwal.id, jadwal.edukator_id, cabangId || null, jenjang, Number(nominal), transportEdukator]
  );

  // Insert transport_ilhami ke kas_pemasukan (jika ada)
  if (transportIlhami > 0) {
    await connection.query(
      `INSERT INTO kas_pemasukan
        (cabang_id, kategori, deskripsi, nominal, tanggal, presensi_id, jadwal_id)
       VALUES (?, 'Transport ILHAMI', 'Transport dari presensi', ?, CURDATE(), ?, ?)`,
      [cabangId || null, transportIlhami, presensiId, jadwal.id]
    );
  }

  return { jenjang, nominal: Number(nominal), klasifikasi: klasifikasiEdukator, transport_ilhami: transportIlhami };
};

const listSlip = async ({ cabangId, edukatorId, year, month }, { limit, offset } = {}) => {
  const targetYear = Number(year || new Date().getFullYear());
  const targetMonth = Number(month || new Date().getMonth() + 1);
  const whereParams = [];
  let where = "WHERE e.is_active = 1";
  if (cabangId) {
    where += " AND e.cabang_utama_id = ?";
    whereParams.push(cabangId);
  }
  if (edukatorId) {
    where += " AND e.id = ?";
    whereParams.push(edukatorId);
  }

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM edukator e ${where}`,
    [...whereParams]
  );

  let infaqFilter = " AND YEAR(gi.tanggal) = ? AND MONTH(gi.tanggal) = ?";
  const infaqParams = [targetYear, targetMonth];
  if (cabangId) {
    infaqFilter += " AND gi.cabang_id = ?";
    infaqParams.push(cabangId);
  }

  // Gaji sudah termasuk klasifikasi dalam nominal per transaksi
  // Gaji tambahan diambil dari tabel manajemen (jabatan manajemen)
  let dataQuery = `SELECT e.id AS edukator_id, e.nama AS edukator_nama,
            e.cabang_utama_id AS cabang_id,
            e.pendidikan_terakhir,
            CASE
              WHEN e.manajemen_id IS NOT NULL AND e.pendidikan_terakhir IN ('S1','S2') THEN 'Sarjana + Manajemen'
              WHEN e.pendidikan_terakhir IN ('S1','S2') THEN 'Sarjana'
              ELSE 'Mahasiswa'
            END AS klasifikasi_label,
            m.nama AS jabatan_manajemen,
            COALESCE(m.gaji_tambahan, 0) AS gaji_tambahan,
            ? AS tahun,
            ? AS bulan,
            COALESCE(SUM(CASE WHEN j.tipe_les = '${TIPE_LES.PRIVAT}' THEN gt.nominal ELSE 0 END), 0) AS gaji_privat,
            COALESCE(SUM(CASE WHEN j.tipe_les = '${TIPE_LES.KELAS}' THEN gt.nominal ELSE 0 END), 0) AS gaji_kelas,
            COUNT(DISTINCT CASE WHEN j.tipe_les = '${TIPE_LES.PRIVAT}' THEN gt.id END) AS jumlah_privat,
            COUNT(DISTINCT CASE WHEN j.tipe_les = '${TIPE_LES.KELAS}' THEN gt.id END) AS jumlah_kelas,
            COALESCE(SUM(gt.nominal), 0) AS gaji_mengajar,
            (SELECT COALESCE(SUM(gi.nominal), 0)
             FROM gaji_infaq gi
             WHERE gi.edukator_id = e.id ${infaqFilter}) AS total_infaq
     FROM edukator e
     LEFT JOIN manajemen m ON m.id = e.manajemen_id
     LEFT JOIN gaji_transaksi gt
       ON gt.edukator_id = e.id
      AND YEAR(gt.created_at) = ?
      AND MONTH(gt.created_at) = ?
     LEFT JOIN jadwal j ON j.id = gt.jadwal_id
     ${where}
     GROUP BY e.id, e.nama, e.pendidikan_terakhir, e.manajemen_id, m.nama, m.gaji_tambahan
     ORDER BY e.nama ASC`;
  const dataParams = [targetYear, targetMonth, ...infaqParams, targetYear, targetMonth, ...whereParams];
  if (limit !== undefined) {
    dataQuery += " LIMIT ? OFFSET ?";
    dataParams.push(limit, offset || 0);
  }
  const [rows] = await db.query(dataQuery, dataParams);

  // Gaji manajemen hanya dihitung jika periode sudah berjalan (bukan bulan depan)
  const includeManajemen = isPeriodStarted(targetYear, targetMonth);

  const mappedRows = rows.map((row) => {
    const gajiMengajar = Number(row.gaji_mengajar || 0);
    const gajiTambahan = includeManajemen ? Number(row.gaji_tambahan || 0) : 0;
    const totalInfaq = Number(row.total_infaq || 0);
    const totalGaji = gajiMengajar + gajiTambahan - totalInfaq;
    return {
      ...row,
      gaji_tambahan: gajiTambahan,
      total_infaq: totalInfaq,
      total_gaji: totalGaji,
    };
  });
  return { rows: mappedRows, total };
};

const createInfaq = async (payload, cabangId, createdBy) => {
  const edukatorId = Number(payload.edukator_id);
  const nominal = Number(payload.nominal);
  const jenisInfaq = String(payload.jenis_infaq || "").trim();
  const tanggal = payload.tanggal;

  if (!edukatorId) throw new Error("Edukator wajib dipilih.");
  if (!jenisInfaq) throw new Error("Jenis infaq wajib diisi.");
  if (!tanggal) throw new Error("Tanggal infaq wajib diisi.");
  if (!nominal || nominal <= 0) throw new Error("Nominal infaq harus lebih dari 0.");

  await db.query(
    `INSERT INTO gaji_infaq (cabang_id, edukator_id, jenis_infaq, nominal, keterangan, tanggal, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      cabangId,
      edukatorId,
      jenisInfaq,
      nominal,
      payload.keterangan || null,
      tanggal,
      createdBy || null,
    ]
  );
};

const createInfaqMassal = async (payload, cabangId, createdBy) => {
  const nominal = Number(payload.nominal);
  const jenisInfaq = String(payload.jenis_infaq || "").trim();
  const tanggal = payload.tanggal;

  if (!jenisInfaq) throw new Error("Jenis infaq wajib diisi.");
  if (!tanggal) throw new Error("Tanggal infaq wajib diisi.");
  if (!nominal || nominal <= 0) throw new Error("Nominal infaq harus lebih dari 0.");
  if (!cabangId) throw new Error("Cabang wajib diisi.");

  await db.query(
    `INSERT INTO gaji_infaq (cabang_id, edukator_id, jenis_infaq, nominal, keterangan, tanggal, created_by)
     SELECT e.cabang_utama_id, e.id, ?, ?, ?, ?, ?
     FROM edukator e
     WHERE e.is_active = 1 AND e.cabang_utama_id = ?`,
    [
      jenisInfaq,
      nominal,
      payload.keterangan || null,
      tanggal,
      createdBy || null,
      cabangId,
    ]
  );
};

const listInfaq = async ({ cabangId, edukatorId, year, month }) => {
  if (!edukatorId) throw new Error("Edukator wajib diisi.");
  const params = [edukatorId];
  let where = "WHERE edukator_id = ?";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  }
  if (year && month) {
    where += " AND YEAR(tanggal) = ? AND MONTH(tanggal) = ?";
    params.push(Number(year), Number(month));
  }
  const [rows] = await db.query(
    `SELECT id, edukator_id, cabang_id, jenis_infaq, nominal, keterangan, tanggal, created_at
     FROM gaji_infaq
     ${where}
     ORDER BY tanggal DESC, id DESC`,
    params
  );
  return rows;
};

const updateInfaq = async (id, payload, cabangId) => {
  const nominal = Number(payload.nominal);
  const jenisInfaq = String(payload.jenis_infaq || "").trim();
  const tanggal = payload.tanggal;

  if (!id) throw new Error("ID infaq tidak valid.");
  if (!jenisInfaq) throw new Error("Jenis infaq wajib diisi.");
  if (!tanggal) throw new Error("Tanggal infaq wajib diisi.");
  if (!nominal || nominal <= 0) throw new Error("Nominal infaq harus lebih dari 0.");

  const params = [jenisInfaq, nominal, payload.keterangan || null, tanggal, id];
  let where = "WHERE id = ?";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  }

  const [result] = await db.query(
    `UPDATE gaji_infaq
     SET jenis_infaq = ?, nominal = ?, keterangan = ?, tanggal = ?
     ${where}`,
    params
  );
  if (!result.affectedRows) throw new Error("Infaq tidak ditemukan.");
};

const deleteInfaq = async (id, cabangId) => {
  if (!id) throw new Error("ID infaq tidak valid.");
  const params = [id];
  let where = "WHERE id = ?";
  if (cabangId) {
    where += " AND cabang_id = ?";
    params.push(cabangId);
  }
  const [result] = await db.query(`DELETE FROM gaji_infaq ${where}`, params);
  if (!result.affectedRows) throw new Error("Infaq tidak ditemukan.");
};

const detectAnomalies = async (cabangId, year, month) => {
  const targetDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const periodStr = `${year}-${String(month).padStart(2, "0")}`;

  // 1. Ambil Gaji Bulan Ini (Target)
  const [currentSalaries] = await db.query(
    `SELECT 
      e.id AS edukator_id, 
      e.nama, 
      e.cabang_utama_id,
      COALESCE(m.gaji_tambahan, 0) AS gaji_manajemen,
      COALESCE(SUM(gt.nominal), 0) AS gaji_mengajar,
      COALESCE(SUM(gt.nominal), 0) + COALESCE(m.gaji_tambahan, 0) AS total_gaji
    FROM edukator e
    LEFT JOIN manajemen m ON m.id = e.manajemen_id
    LEFT JOIN gaji_transaksi gt ON gt.edukator_id = e.id 
      AND YEAR(gt.created_at) = ? AND MONTH(gt.created_at) = ?
    WHERE (? IS NULL OR e.cabang_utama_id = ?) AND e.is_active = 1
    GROUP BY e.id, e.nama, e.cabang_utama_id, m.gaji_tambahan
    HAVING total_gaji > 0`,
    [year, month, cabangId, cabangId]
  );

  const anomalies = [];

  for (const edu of currentSalaries) {
    // 2. Ambil Data Historis (6 Bulan Terakhir sebelum bulan target)
    const [history] = await db.query(
      `SELECT 
        DATE_FORMAT(gt.created_at, '%Y-%m') as period,
        SUM(gt.nominal) as total_mengajar
      FROM gaji_transaksi gt
      WHERE gt.edukator_id = ?
        AND gt.created_at < ? 
        AND gt.created_at >= DATE_SUB(?, INTERVAL 6 MONTH)
      GROUP BY period
      ORDER BY period ASC`,
      [edu.edukator_id, targetDate, targetDate]
    );

    // Construct historical data points (Total Gaji)
    // Menggunakan gaji_manajemen saat ini sebagai baseline konstan untuk history
    const dataPoints = history.map(
      (h) => Number(h.total_mengajar) + Number(edu.gaji_manajemen)
    );

    // Jika data kurang dari 3 bulan, skip (tidak cukup untuk statistik)
    if (dataPoints.length < 3) continue;

    // 3. Hitung Statistik (Mean & StdDev)
    const sum = dataPoints.reduce((a, b) => a + b, 0);
    const mean = sum / dataPoints.length;

    const variance =
      dataPoints.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / dataPoints.length;
    const stdDev = Math.sqrt(variance);

    // Jika deviasi standar 0 (gaji selalu sama persis), dan sekarang beda, itu anomali
    if (stdDev === 0) {
      if (edu.total_gaji !== mean) {
        anomalies.push({
          edukator_id: edu.edukator_id,
          nama: edu.nama,
          total_gaji: edu.total_gaji,
          rata_rata: Math.round(mean),
          z_score: 999, // Infinite z-score technically
          pesan: "Perubahan dari nilai historis yang konstan",
        });
      }
      continue;
    }

    // 4. Hitung Z-Score
    const zScore = (edu.total_gaji - mean) / stdDev;

    // Threshold Z-Score > 2 (Sekitar 95% confidence interval, di luar itu outlier)
    if (Math.abs(zScore) > 2) {
      const anomaly = {
        edukator_id: edu.edukator_id,
        nama: edu.nama,
        total_gaji: edu.total_gaji,
        rata_rata: Math.round(mean),
        z_score: Number(zScore.toFixed(2)),
        pesan: zScore > 0 ? "Lonjakan Gaji Signifikan" : "Penurunan Gaji Signifikan",
        history: dataPoints,
      };
      anomalies.push(anomaly);

      // --- KIRIM NOTIFIKASI OTOMATIS ---
      // Cari admin cabang terkait dan super admin
      const [admins] = await db.query(
        `SELECT id FROM users WHERE (role = '${ROLES.ADMIN_CABANG}' AND cabang_id = ?) OR role = '${ROLES.SUPER_ADMIN}'`,
        [edu.cabang_utama_id]
      );

      for (const admin of admins) {
        const exists = await notifikasiService.hasAnomalyNotification(admin.id, edu.edukator_id, periodStr);
        if (!exists) {
           await notifikasiService.insertNotifikasi(db, {
             user_id: admin.id,
             tipe_notifikasi: 'anomali_gaji',
             judul: 'Deteksi Anomali Gaji',
             pesan: `Peringatan: ${anomaly.pesan} untuk ${edu.nama} (${periodStr}). Total: Rp ${new Intl.NumberFormat('id-ID').format(edu.total_gaji)}`,
             data_ref: { edukator_id: edu.edukator_id, period: periodStr, z_score: anomaly.z_score }
           });
        }
      }
    }
  }

  return anomalies;
};

module.exports = {
  listSetting,
  saveSetting,
  deleteTarif,
  listTarifNames,
  listTarifForProgram,
  listSlip,
  createInfaq,
  createInfaqMassal,
  listInfaq,
  updateInfaq,
  deleteInfaq,
  createTransaksiFromPresensi,
  normalizeJenjang,
  getKlasifikasiEdukator,
  getSettingNominal,
  getEdukatorInfo,
  getProgramDataFromJadwal,
  getTarifFromProgram,
  listTipeLes,
  createTipeLes,
  deleteTipeLes,
  JENJANGS,
  KLASIFIKASI_EDUKATOR,
  detectAnomalies,
};
