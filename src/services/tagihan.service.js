const db = require("../db");
const notifikasiService = require("./notifikasi.service");
const { ROLES, ENROLLMENT_STATUS } = require("../config/constants");

const getSiswaIdByUserId = async (userId) => {
  const [rows] = await db.query("SELECT id FROM siswa WHERE user_id = ? LIMIT 1", [userId]);
  return rows[0]?.id || null;
};

const getActivePromo = async (conn, cabangId, programId, tanggal) => {
  if (!cabangId || !programId || !tanggal) return null;
  const [rows] = await conn.query(
    `SELECT id, tipe_diskon, nilai
     FROM promo
     WHERE cabang_id = ? AND program_id = ? AND is_active = 1
       AND tanggal_mulai <= ? AND tanggal_selesai >= ?
     ORDER BY tanggal_mulai DESC
     LIMIT 1`,
    [cabangId, programId, tanggal, tanggal]
  );
  return rows[0] || null;
};

const applyPromo = (nominal, promo) => {
  if (!promo) return nominal;
  const base = Number(nominal || 0);
  if (promo.tipe_diskon === "percent") {
    const result = base - base * (Number(promo.nilai || 0) / 100);
    return Math.max(0, Math.round(result));
  }
  if (promo.tipe_diskon === "fixed") {
    const result = base - Number(promo.nilai || 0);
    return Math.max(0, Math.round(result));
  }
  return base;
};

const listTagihan = async ({ cabangId, siswaId, year, month }, { limit, offset } = {}) => {
  const params = [];
  let where = "WHERE 1=1";

  if (cabangId) {
    where += " AND t.cabang_id = ?";
    params.push(cabangId);
  }
  if (siswaId) {
    where += " AND t.siswa_id = ?";
    params.push(siswaId);
  }
  if (year && month) {
    where += " AND YEAR(t.tanggal_jatuh_tempo) = ? AND MONTH(t.tanggal_jatuh_tempo) = ?";
    params.push(year, month);
  }

  const [[{ total }]] = await db.query(
    `SELECT COUNT(*) AS total FROM tagihan t ${where}`,
    [...params]
  );

  let dataQuery = `SELECT t.id, t.cabang_id, t.siswa_id, t.enrollment_id, t.jenis_tagihan,
            t.nominal, t.tanggal_jatuh_tempo, t.status_tagihan, t.created_at,
            s.nama AS siswa_nama, p.nama AS program_nama,
            IFNULL(SUM(pb.nominal), 0) AS total_bayar
     FROM tagihan t
     JOIN siswa s ON s.id = t.siswa_id
     JOIN enrollment en ON en.id = t.enrollment_id
     JOIN program p ON p.id = en.program_id
     LEFT JOIN pembayaran pb ON pb.tagihan_id = t.id
     ${where}
     GROUP BY t.id
     ORDER BY t.created_at DESC`;
  const dataParams = [...params];
  if (limit !== undefined) {
    dataQuery += " LIMIT ? OFFSET ?";
    dataParams.push(limit, offset || 0);
  }
  const [rows] = await db.query(dataQuery, dataParams);
  return { rows, total };
};

const listEnrollments = async (cabangId) => {
  const params = [];
  let where = `WHERE en.status_enrollment = '${ENROLLMENT_STATUS.AKTIF}'`;
  if (cabangId) {
    where += " AND s.cabang_id = ?";
    params.push(cabangId);
  }

  const [rows] = await db.query(
    `SELECT en.id AS enrollment_id, s.id AS siswa_id, s.nama AS siswa_nama, s.kelas,
            p.id AS program_id, p.nama AS program_nama, p.tipe_les, p.harga
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN program p ON p.id = en.program_id
     ${where}
     ORDER BY s.nama ASC`,
    params
  );
  return rows;
};

const createTagihan = async (payload, cabangId) => {
  const { enrollment_id, jenis_tagihan, nominal, tanggal_jatuh_tempo, status_tagihan } = payload;

  if (!enrollment_id) {
    throw new Error("Siswa/program wajib dipilih.");
  }
  if (!jenis_tagihan || !["program", "bulanan"].includes(jenis_tagihan)) {
    throw new Error("Jenis tagihan tidak valid.");
  }
  if (!tanggal_jatuh_tempo) {
    throw new Error("Tanggal jatuh tempo wajib diisi.");
  }

  const [rows] = await db.query(
    `SELECT en.id, en.siswa_id, s.cabang_id, s.nama AS siswa_nama, u.id AS user_id,
            p.id AS program_id, p.harga, p.nama AS program_nama
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN users u ON u.id = s.user_id
     JOIN program p ON p.id = en.program_id
     WHERE en.id = ?`,
    [enrollment_id]
  );
  const enrollment = rows[0];
  if (!enrollment) {
    throw new Error("Enrollment tidak ditemukan.");
  }
  if (cabangId && enrollment.cabang_id !== cabangId) {
    throw new Error("Cabang tidak sesuai.");
  }

  const baseNominal = nominal ? Number(nominal) : Number(enrollment.harga || 0);
  const promo = await getActivePromo(
    db,
    enrollment.cabang_id,
    enrollment.program_id,
    tanggal_jatuh_tempo
  );
  const finalNominal = applyPromo(baseNominal, promo);
  if (Number.isNaN(finalNominal) || finalNominal < 0) {
    throw new Error("Nominal tagihan tidak valid.");
  }

  const [result] = await db.query(
    `INSERT INTO tagihan
      (cabang_id, siswa_id, enrollment_id, jenis_tagihan, nominal, tanggal_jatuh_tempo, status_tagihan)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      enrollment.cabang_id,
      enrollment.siswa_id,
      enrollment_id,
      jenis_tagihan,
      finalNominal,
      tanggal_jatuh_tempo,
      status_tagihan || "belum_bayar",
    ]
  );

  await notifikasiService.insertNotifikasi(db, {
    user_id: enrollment.user_id,
    tipe_notifikasi: "tagihan",
    judul: "Tagihan baru",
    pesan: `Tagihan program ${enrollment.program_nama} untuk ${enrollment.siswa_nama} telah dibuat.`,
    data_ref: { tagihan_id: result.insertId, enrollment_id },
  });

  const [adminRows] = await db.query(
    `SELECT id FROM users
     WHERE role = '${ROLES.ADMIN_CABANG}' AND cabang_id = ? AND is_active = 1`,
    [enrollment.cabang_id]
  );
  for (const admin of adminRows) {
    await notifikasiService.insertNotifikasi(db, {
      user_id: admin.id,
      tipe_notifikasi: "tagihan",
      judul: "Tagihan baru cabang",
      pesan: `Tagihan baru untuk ${enrollment.siswa_nama} (${enrollment.program_nama}).`,
      data_ref: { tagihan_id: result.insertId, enrollment_id },
    });
  }

  return { id: result.insertId };
};

const getCabangDueDays = async (conn, cabangId) => {
  if (!cabangId) return 10;
  const [rows] = await conn.query(
    "SELECT tanggal_jatuh_tempo FROM cabang WHERE id = ?",
    [cabangId]
  );
  const days = Number(rows[0]?.tanggal_jatuh_tempo || 10);
  return Number.isNaN(days) ? 10 : days;
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const createTagihanForEnrollment = async (conn, enrollmentId, cabangId) => {
  if (!enrollmentId) {
    throw new Error("Enrollment tidak ditemukan.");
  }

  const [rows] = await conn.query(
    `SELECT en.id, en.siswa_id, s.cabang_id, s.nama AS siswa_nama, u.id AS user_id,
            p.id AS program_id, p.harga, p.nama AS program_nama
     FROM enrollment en
     JOIN siswa s ON s.id = en.siswa_id
     JOIN users u ON u.id = s.user_id
     JOIN program p ON p.id = en.program_id
     WHERE en.id = ?`,
    [enrollmentId]
  );
  const enrollment = rows[0];
  if (!enrollment) {
    throw new Error("Enrollment tidak ditemukan.");
  }
  if (cabangId && enrollment.cabang_id !== cabangId) {
    throw new Error("Cabang tidak sesuai.");
  }

  const dueDays = await getCabangDueDays(conn, enrollment.cabang_id);
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + dueDays);
  const dueDateStr = formatDate(dueDate);
  const promo = await getActivePromo(
    conn,
    enrollment.cabang_id,
    enrollment.program_id,
    dueDateStr
  );
  const finalNominal = applyPromo(Number(enrollment.harga || 0), promo);

  const [result] = await conn.query(
    `INSERT INTO tagihan
      (cabang_id, siswa_id, enrollment_id, jenis_tagihan, nominal, tanggal_jatuh_tempo, status_tagihan)
     VALUES (?, ?, ?, 'program', ?, ?, 'belum_bayar')`,
    [
      enrollment.cabang_id,
      enrollment.siswa_id,
      enrollment.id,
      finalNominal,
      dueDateStr,
    ]
  );

  await notifikasiService.insertNotifikasi(conn, {
    user_id: enrollment.user_id,
    tipe_notifikasi: "tagihan",
    judul: "Tagihan baru",
    pesan: `Tagihan program ${enrollment.program_nama} untuk ${enrollment.siswa_nama} telah dibuat.`,
    data_ref: { tagihan_id: result.insertId, enrollment_id: enrollment.id },
  });

  const [adminRows] = await conn.query(
    `SELECT id FROM users
     WHERE role = '${ROLES.ADMIN_CABANG}' AND cabang_id = ? AND is_active = 1`,
    [enrollment.cabang_id]
  );
  for (const admin of adminRows) {
    await notifikasiService.insertNotifikasi(conn, {
      user_id: admin.id,
      tipe_notifikasi: "tagihan",
      judul: "Tagihan baru cabang",
      pesan: `Tagihan baru untuk ${enrollment.siswa_nama} (${enrollment.program_nama}).`,
      data_ref: { tagihan_id: result.insertId, enrollment_id: enrollment.id },
    });
  }
  return { id: result.insertId };
};

const deleteTagihan = async (id, cabangId) => {
  const [rows] = await db.query(
    `SELECT id, cabang_id FROM tagihan WHERE id = ?`,
    [id]
  );
  const tagihan = rows[0];
  if (!tagihan) {
    throw new Error("Tagihan tidak ditemukan.");
  }
  if (cabangId && tagihan.cabang_id !== cabangId) {
    throw new Error("Cabang tidak sesuai.");
  }

  const [payRows] = await db.query(
    `SELECT COUNT(*) AS total FROM pembayaran WHERE tagihan_id = ?`,
    [id]
  );
  if (Number(payRows[0]?.total || 0) > 0) {
    throw new Error("Tagihan sudah memiliki pembayaran.");
  }

  await db.query("DELETE FROM tagihan WHERE id = ?", [id]);
  return { id };
};

module.exports = {
  getSiswaIdByUserId,
  listTagihan,
  listEnrollments,
  createTagihan,
  createTagihanForEnrollment,
  deleteTagihan,
};
