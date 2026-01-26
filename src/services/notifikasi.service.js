const db = require("../db");

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
       AND JSON_UNQUOTE(JSON_EXTRACT(data_ref, '$.tagihan_id')) = ?
       AND DATE(created_at) = CURDATE()
     LIMIT 1`,
    [userId, String(tagihanId)]
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
     WHERE t.status_tagihan != 'lunas'
       AND t.tanggal_jatuh_tempo BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 3 DAY)`
  );

  if (!rows.length) return { total: 0 };

  const cabangIds = [...new Set(rows.map((row) => row.cabang_id).filter(Boolean))];
  const adminByCabang = new Map();

  for (const cabangId of cabangIds) {
    const [adminRows] = await db.query(
      `SELECT id FROM users
       WHERE role = 'admin_cabang' AND cabang_id = ? AND is_active = 1`,
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

module.exports = {
  insertNotifikasi,
  createTagihanReminders,
};
