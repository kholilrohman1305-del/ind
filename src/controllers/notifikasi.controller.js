const db = require("../db");
const { ROLES } = require("../config/constants");
const notifikasiService = require("../services/notifikasi.service");

// Get user's notifications
const getNotifications = async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 20, offset = 0, unread_only } = req.query;

    let query = `
      SELECT id, tipe_notifikasi, judul, pesan, data_ref, is_read, created_at
      FROM notifikasi
      WHERE user_id = ?
    `;
    const params = [userId];

    if (unread_only === 'true') {
      query += ` AND is_read = 0`;
    }

    query += ` ORDER BY created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit), parseInt(offset));

    const [rows] = await db.query(query, params);

    // Get unread count
    const [countRows] = await db.query(
      `SELECT COUNT(*) as count FROM notifikasi WHERE user_id = ? AND is_read = 0`,
      [userId]
    );

    res.json({
      success: true,
      data: {
        notifications: rows.map(row => ({
          ...row,
          data_ref: row.data_ref ? JSON.parse(row.data_ref) : null
        })),
        unread_count: countRows[0]?.count || 0,
        total: rows.length
      }
    });
  } catch (err) {
    console.error("Error fetching notifications:", err);
    res.status(500).json({ success: false, message: "Gagal memuat notifikasi" });
  }
};

// Mark notification(s) as read
const markAsRead = async (req, res) => {
  try {
    const userId = req.user.id;
    const { notification_ids } = req.body; // array of IDs or "all"

    if (notification_ids === "all") {
      await db.query(
        `UPDATE notifikasi SET is_read = 1 WHERE user_id = ? AND is_read = 0`,
        [userId]
      );
    } else if (Array.isArray(notification_ids)) {
      if (notification_ids.length === 0) {
        return res.json({ success: true, message: "Tidak ada notifikasi yang diperbarui" });
      }
      await db.query(
        `UPDATE notifikasi SET is_read = 1 WHERE id IN (${notification_ids.map(() => '?').join(',')}) AND user_id = ?`,
        [...notification_ids, userId]
      );
    } else {
      return res.status(400).json({ success: false, message: "Format tidak valid" });
    }

    res.json({ success: true, message: "Notifikasi ditandai sebagai dibaca" });
  } catch (err) {
    console.error("Error marking as read:", err);
    res.status(500).json({ success: false, message: "Gagal memperbarui notifikasi" });
  }
};

// Create announcement (admin cabang only)
const createAnnouncement = async (req, res) => {
  try {
    const { judul, pesan, target_role } = req.body; // target_role: 'edukator', 'siswa', or 'all'
    const adminId = req.user.id;
    const cabangId = req.user.cabang_id;

    if (!judul || !pesan) {
      return res.status(400).json({ success: false, message: "Judul dan pesan wajib diisi" });
    }

    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang tidak ditemukan" });
    }

    // Get target users (edukator and/or siswa in the same cabang)
    let targetUserIds = [];

    if (target_role === 'edukator' || target_role === 'all') {
      const [edukatorRows] = await db.query(
        `SELECT u.id FROM users u
         JOIN edukator e ON e.user_id = u.id
         WHERE e.cabang_id = ? AND e.is_active = 1 AND u.is_active = 1`,
        [cabangId]
      );
      targetUserIds.push(...edukatorRows.map(r => r.id));
    }

    if (target_role === 'siswa' || target_role === 'all') {
      const [siswaRows] = await db.query(
        `SELECT u.id FROM users u
         JOIN siswa s ON s.user_id = u.id
         WHERE s.cabang_id = ? AND s.status = 'aktif' AND u.is_active = 1`,
        [cabangId]
      );
      targetUserIds.push(...siswaRows.map(r => r.id));
    }

    // Remove duplicates
    targetUserIds = [...new Set(targetUserIds)];

    if (targetUserIds.length === 0) {
      return res.status(400).json({ success: false, message: "Tidak ada penerima yang ditemukan" });
    }

    // Insert notifications for all targets
    const dataRef = { admin_id: adminId, cabang_id: cabangId, target_role };

    for (const userId of targetUserIds) {
      await notifikasiService.insertNotifikasi(db, {
        user_id: userId,
        tipe_notifikasi: 'pengumuman',
        judul,
        pesan,
        data_ref: dataRef
      });
    }

    res.json({
      success: true,
      message: `Pengumuman berhasil dikirim ke ${targetUserIds.length} penerima`,
      data: { recipient_count: targetUserIds.length }
    });
  } catch (err) {
    console.error("Error creating announcement:", err);
    res.status(500).json({ success: false, message: "Gagal membuat pengumuman" });
  }
};

// Get announcements created by admin cabang
const getAnnouncements = async (req, res) => {
  try {
    const cabangId = req.user.cabang_id;
    const { limit = 20 } = req.query;

    if (!cabangId) {
      return res.status(400).json({ success: false, message: "Cabang tidak ditemukan" });
    }

    // Get unique announcements (grouped by judul+pesan+created_at)
    const [rows] = await db.query(
      `SELECT
         tipe_notifikasi, judul, pesan, data_ref, created_at,
         COUNT(DISTINCT user_id) as recipient_count,
         SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read_count
       FROM notifikasi
       WHERE tipe_notifikasi = 'pengumuman'
         AND JSON_UNQUOTE(JSON_EXTRACT(data_ref, '$.cabang_id')) = ?
       GROUP BY judul, pesan, created_at
       ORDER BY created_at DESC
       LIMIT ?`,
      [String(cabangId), parseInt(limit)]
    );

    res.json({
      success: true,
      data: rows.map(row => ({
        ...row,
        data_ref: row.data_ref ? JSON.parse(row.data_ref) : null
      }))
    });
  } catch (err) {
    console.error("Error fetching announcements:", err);
    res.status(500).json({ success: false, message: "Gagal memuat pengumuman" });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  createAnnouncement,
  getAnnouncements
};
