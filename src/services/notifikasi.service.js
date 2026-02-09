const db = require("../db");
const { ROLES, TAGIHAN_STATUS, JADWAL_STATUS, TIPE_LES } = require("../config/constants");

const insertNotifikasi = async (conn, payload) => {
  const runner = conn || db;
  const {
    user_id,
    tipe_notifikasi,
    judul,
    pesan,
    data_ref,
    wa_status,
  } = payload;

  if (!user_id || !tipe_notifikasi || !judul || !pesan) return null;

  const dataRefValue = data_ref ? JSON.stringify(data_ref) : null;
  const [result] = await runner.query(
    `INSERT INTO notifikasi
      (user_id, tipe_notifikasi, judul, pesan, data_ref, wa_status)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      user_id,
      tipe_notifikasi,
      judul,
      pesan,
      dataRefValue,
      wa_status || "pending",
    ]
  );

  return { id: result.insertId };
};

const hasTagihanReminderToday = async (userId, tagihanId) => {
  const [rows] = await db.query(
    `SELECT id
     FROM notifikasi
     WHERE user_id = ?
       AND tipe_notifikasi = 'tagihan'
       AND DATE(created_at) = CURDATE()
       AND data_ref LIKE ?
     LIMIT 1`,
    [userId, `%"tagihan_id":${tagihanId}%`]
  );
  return rows.length > 0;
};

const createTagihanReminders = async () => {
  const [rows] = await db.query(
    `SELECT t.id, t.cabang_id, t.siswa_id, t.tanggal_jatuh_tempo,
            DATEDIFF(t.tanggal_jatuh_tempo, CURDATE()) AS hari_sisa,
            s.nama AS siswa_nama,
            u.id AS user_id
     FROM tagihan t
     JOIN siswa s ON s.id = t.siswa_id
     JOIN users u ON u.id = s.user_id
     WHERE t.status_tagihan != '${TAGIHAN_STATUS.LUNAS}'
       AND t.tanggal_jatuh_tempo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
  );

  if (!rows.length) return { total: 0 };

  const cabangIds = [...new Set(rows.map((row) => row.cabang_id).filter(Boolean))];
  const adminByCabang = new Map();

  for (const cabangId of cabangIds) {
    const [adminRows] = await db.query(
      `SELECT id FROM users
       WHERE role = '${ROLES.ADMIN_CABANG}' AND cabang_id = ? AND is_active = 1`,
      [cabangId]
    );
    adminByCabang.set(
      cabangId,
      adminRows.map((row) => row.id)
    );
  }

  let total = 0;
  for (const row of rows) {
    const hariSisa = Number(row.hari_sisa || 0);
    const hariLabel = hariSisa === 0 ? "hari ini" : `${hariSisa} hari lagi`;
    const judul = "Pengingat Tagihan";
    const pesan = `Tagihan ${row.siswa_nama} jatuh tempo ${hariLabel}.`;
    const dataRef = { tagihan_id: row.id, hari_sisa: hariSisa };

    if (!(await hasTagihanReminderToday(row.user_id, row.id))) {
      await insertNotifikasi(db, {
        user_id: row.user_id,
        tipe_notifikasi: "tagihan",
        judul,
        pesan,
        data_ref: dataRef,
      });
      total += 1;
    }

    const adminIds = adminByCabang.get(row.cabang_id) || [];
    for (const adminId of adminIds) {
      if (await hasTagihanReminderToday(adminId, row.id)) continue;
      await insertNotifikasi(db, {
        user_id: adminId,
        tipe_notifikasi: "tagihan",
        judul: "Pengingat Tagihan Cabang",
        pesan: `Tagihan siswa ${row.siswa_nama} jatuh tempo ${hariLabel}.`,
        data_ref: dataRef,
      });
      total += 1;
    }
  }

  return { total };
};

const hasAnomalyNotification = async (userId, edukatorId, period) => {
  const [rows] = await db.query(
    `SELECT id
     FROM notifikasi
     WHERE user_id = ?
       AND tipe_notifikasi = 'anomali_gaji'
       AND JSON_UNQUOTE(JSON_EXTRACT(data_ref, '$.edukator_id')) = ?
       AND JSON_UNQUOTE(JSON_EXTRACT(data_ref, '$.period')) = ?
     LIMIT 1`,
    [userId, String(edukatorId), period]
  );
  return rows.length > 0;
};

// Check for overdue tagihan today
const hasOverdueNotificationToday = async (userId, tagihanId) => {
  const [rows] = await db.query(
    `SELECT id
     FROM notifikasi
     WHERE user_id = ?
       AND tipe_notifikasi = 'tagihan_overdue'
       AND DATE(created_at) = CURDATE()
       AND data_ref LIKE ?
     LIMIT 1`,
    [userId, `%"tagihan_id":${tagihanId}%`]
  );
  return rows.length > 0;
};

// Update status tagihan yang sudah melewati jatuh tempo menjadi overdue
// dan buat notifikasi untuk siswa dan admin
const updateOverdueTagihan = async () => {
  // 1. Update status tagihan yang sudah lewat jatuh tempo
  const [updateResult] = await db.query(
    `UPDATE tagihan
     SET status_tagihan = 'overdue'
     WHERE status_tagihan = 'belum_bayar'
       AND tanggal_jatuh_tempo < CURDATE()`
  );

  const updatedCount = updateResult.affectedRows || 0;

  // 2. Get overdue tagihan untuk notifikasi (yang belum dinotifikasi hari ini)
  const [rows] = await db.query(
    `SELECT t.id, t.cabang_id, t.siswa_id, t.tanggal_jatuh_tempo, t.nominal,
            DATEDIFF(CURDATE(), t.tanggal_jatuh_tempo) AS hari_terlambat,
            s.nama AS siswa_nama,
            u.id AS user_id
     FROM tagihan t
     JOIN siswa s ON s.id = t.siswa_id
     JOIN users u ON u.id = s.user_id
     WHERE t.status_tagihan = 'overdue'`
  );

  if (!rows.length) return { updated: updatedCount, notified: 0 };

  // Get admin per cabang
  const cabangIds = [...new Set(rows.map((row) => row.cabang_id).filter(Boolean))];
  const adminByCabang = new Map();

  for (const cabangId of cabangIds) {
    const [adminRows] = await db.query(
      `SELECT id FROM users
       WHERE role = '${ROLES.ADMIN_CABANG}' AND cabang_id = ? AND is_active = 1`,
      [cabangId]
    );
    adminByCabang.set(
      cabangId,
      adminRows.map((row) => row.id)
    );
  }

  let notified = 0;
  for (const row of rows) {
    const hariTerlambat = Number(row.hari_terlambat || 0);
    const judul = "Tagihan Terlambat";
    const pesan = `Tagihan Anda sudah terlambat ${hariTerlambat} hari. Mohon segera lakukan pembayaran.`;
    const dataRef = { tagihan_id: row.id, hari_terlambat: hariTerlambat, nominal: row.nominal };

    // Notifikasi ke siswa (hanya jika belum ada notifikasi hari ini)
    if (!(await hasOverdueNotificationToday(row.user_id, row.id))) {
      await insertNotifikasi(db, {
        user_id: row.user_id,
        tipe_notifikasi: "tagihan_overdue",
        judul,
        pesan,
        data_ref: dataRef,
      });
      notified += 1;
    }

    // Notifikasi ke admin cabang
    const adminIds = adminByCabang.get(row.cabang_id) || [];
    for (const adminId of adminIds) {
      if (await hasOverdueNotificationToday(adminId, row.id)) continue;
      await insertNotifikasi(db, {
        user_id: adminId,
        tipe_notifikasi: "tagihan_overdue",
        judul: "Tagihan Siswa Terlambat",
        pesan: `Tagihan siswa ${row.siswa_nama} sudah terlambat ${hariTerlambat} hari.`,
        data_ref: dataRef,
      });
      notified += 1;
    }
  }

  return { updated: updatedCount, notified };
};

const hasJadwalReminderToday = async (userId, jadwalId, targetRole) => {
  const [rows] = await db.query(
    `SELECT id
     FROM notifikasi
     WHERE user_id = ?
       AND tipe_notifikasi = 'jadwal_h0'
       AND DATE(created_at) = CURDATE()
       AND data_ref LIKE ?
     LIMIT 1`,
    [userId, `%"jadwal_id":${jadwalId}%\"target\":\"${targetRole}\"%`]
  );
  return rows.length > 0;
};

const createJadwalRemindersH0 = async () => {
  // Privat schedules today
  const [privatRows] = await db.query(
    `SELECT j.id AS jadwal_id, j.tanggal, j.jam_mulai, j.jam_selesai, j.tipe_les,
            s.id AS siswa_id, s.nama AS siswa_nama, su.id AS siswa_user_id,
            e.id AS edukator_id, e.nama AS edukator_nama, eu.id AS edukator_user_id,
            m.nama AS mapel_nama
     FROM jadwal j
     JOIN enrollment en ON en.id = j.enrollment_id
     JOIN siswa s ON s.id = en.siswa_id
     JOIN users su ON su.id = s.user_id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     LEFT JOIN users eu ON eu.id = e.user_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     WHERE j.tanggal = CURDATE()
       AND j.status_jadwal = '${JADWAL_STATUS.SCHEDULED}'
       AND j.tipe_les != '${TIPE_LES.KELAS}'`
  );

  // Kelas schedules today
  const [kelasRows] = await db.query(
    `SELECT j.id AS jadwal_id, j.tanggal, j.jam_mulai, j.jam_selesai, j.tipe_les,
            k.nama AS kelas_nama,
            e.id AS edukator_id, e.nama AS edukator_nama, eu.id AS edukator_user_id,
            m.nama AS mapel_nama
     FROM jadwal j
     JOIN kelas k ON k.id = j.kelas_id
     LEFT JOIN edukator e ON e.id = j.edukator_id
     LEFT JOIN users eu ON eu.id = e.user_id
     LEFT JOIN mapel m ON m.id = j.mapel_id
     WHERE j.tanggal = CURDATE()
       AND j.status_jadwal = '${JADWAL_STATUS.SCHEDULED}'
       AND j.tipe_les = '${TIPE_LES.KELAS}'`
  );

  let kelasSiswaRows = [];
  if (kelasRows.length) {
    const kelasIds = kelasRows.map((row) => row.jadwal_id);
    const [rows] = await db.query(
      `SELECT jks.jadwal_id, s.id AS siswa_id, s.nama AS siswa_nama, u.id AS siswa_user_id
       FROM jadwal_kelas_siswa jks
       JOIN siswa s ON s.id = jks.siswa_id
       JOIN users u ON u.id = s.user_id
       WHERE jks.jadwal_id IN (${kelasIds.map(() => "?").join(",")})`,
      kelasIds
    );
    kelasSiswaRows = rows || [];
  }

  let total = 0;

  // Notif privat
  for (const row of privatRows) {
    const timeLabel = `${String(row.jam_mulai).slice(0, 5)}-${String(row.jam_selesai).slice(0, 5)}`;
    const mapelLabel = row.mapel_nama || "Mapel";

    // Siswa
    if (row.siswa_user_id && !(await hasJadwalReminderToday(row.siswa_user_id, row.jadwal_id, "siswa"))) {
      await insertNotifikasi(db, {
        user_id: row.siswa_user_id,
        tipe_notifikasi: "jadwal_h0",
        judul: "Pengingat Jadwal Hari Ini",
        pesan: `Hari ini ada jadwal ${mapelLabel} pukul ${timeLabel} bersama ${row.edukator_nama || "Edukator"}.`,
        data_ref: { jadwal_id: row.jadwal_id, target: "siswa" },
        wa_status: "pending",
      });
      total += 1;
    }

    // Edukator
    if (row.edukator_user_id && !(await hasJadwalReminderToday(row.edukator_user_id, row.jadwal_id, "edukator"))) {
      await insertNotifikasi(db, {
        user_id: row.edukator_user_id,
        tipe_notifikasi: "jadwal_h0",
        judul: "Pengingat Mengajar Hari Ini",
        pesan: `Hari ini ada jadwal ${mapelLabel} pukul ${timeLabel} bersama ${row.siswa_nama || "Siswa"}.`,
        data_ref: { jadwal_id: row.jadwal_id, target: "edukator" },
        wa_status: "pending",
      });
      total += 1;
    }
  }

  // Notif kelas: edukator
  for (const row of kelasRows) {
    const timeLabel = `${String(row.jam_mulai).slice(0, 5)}-${String(row.jam_selesai).slice(0, 5)}`;
    const mapelLabel = row.mapel_nama || "Mapel";
    const kelasLabel = row.kelas_nama || "Kelas";

    if (row.edukator_user_id && !(await hasJadwalReminderToday(row.edukator_user_id, row.jadwal_id, "edukator"))) {
      await insertNotifikasi(db, {
        user_id: row.edukator_user_id,
        tipe_notifikasi: "jadwal_h0",
        judul: "Pengingat Mengajar Hari Ini",
        pesan: `Hari ini ada jadwal ${kelasLabel} (${mapelLabel}) pukul ${timeLabel}.`,
        data_ref: { jadwal_id: row.jadwal_id, target: "edukator" },
        wa_status: "pending",
      });
      total += 1;
    }
  }

  // Notif kelas: siswa
  for (const row of kelasSiswaRows) {
    const kelasInfo = kelasRows.find((k) => String(k.jadwal_id) === String(row.jadwal_id));
    if (!kelasInfo) continue;
    const timeLabel = `${String(kelasInfo.jam_mulai).slice(0, 5)}-${String(kelasInfo.jam_selesai).slice(0, 5)}`;
    const mapelLabel = kelasInfo.mapel_nama || "Mapel";
    const kelasLabel = kelasInfo.kelas_nama || "Kelas";

    if (row.siswa_user_id && !(await hasJadwalReminderToday(row.siswa_user_id, row.jadwal_id, "siswa"))) {
      await insertNotifikasi(db, {
        user_id: row.siswa_user_id,
        tipe_notifikasi: "jadwal_h0",
        judul: "Pengingat Jadwal Hari Ini",
        pesan: `Hari ini ada jadwal ${kelasLabel} (${mapelLabel}) pukul ${timeLabel}.`,
        data_ref: { jadwal_id: row.jadwal_id, target: "siswa" },
        wa_status: "pending",
      });
      total += 1;
    }
  }

  return { total };
};

module.exports = {
  insertNotifikasi,
  createTagihanReminders,
  hasAnomalyNotification,
  updateOverdueTagihan,
  createJadwalRemindersH0,
};
