const notifikasiService = require("../services/notifikasi.service");

const runReminderJob = async ({ silent = false } = {}) => {
  if (!silent) {
    console.log("[Job] Memulai pengecekan pengingat tagihan...");
  }

  try {
    // 0. Pengingat jadwal H-0 (untuk siswa & edukator)
    const jadwalResult = await notifikasiService.createJadwalRemindersH0();
    if (!silent) {
      if (jadwalResult && jadwalResult.total > 0) {
        console.log(`[Job] Terkirim ${jadwalResult.total} pengingat jadwal H-0.`);
      } else {
        console.log("[Job] Tidak ada jadwal H-0 yang perlu diingatkan.");
      }
    }

    // 1. Pengingat tagihan mendekati jatuh tempo (H-3 sampai H-0)
    const result = await notifikasiService.createTagihanReminders();
    if (!silent) {
      if (result && result.total > 0) {
        console.log(`[Job] Terkirim ${result.total} pengingat tagihan.`);
      } else {
        console.log("[Job] Tidak ada tagihan yang perlu diingatkan hari ini.");
      }
    }

    // 2. Update status tagihan overdue dan buat notifikasi
    const overdueResult = await notifikasiService.updateOverdueTagihan();
    if (!silent) {
      if (overdueResult.updated > 0 || overdueResult.notified > 0) {
        console.log(`[Job] Tagihan overdue: ${overdueResult.updated} diupdate, ${overdueResult.notified} notifikasi terkirim.`);
      }
    }
  } catch (err) {
    if (!silent) {
      console.error("Reminder job error:", err.message);
    }
  }
};

const startReminderJob = () => {
  const ONE_DAY = 24 * 60 * 60 * 1000;

  const scheduleDailyAt = (hour, minute, task) => {
    const now = new Date();
    const next = new Date();
    next.setHours(hour, minute, 0, 0);
    if (next <= now) {
      next.setDate(next.getDate() + 1);
    }
    const delay = next.getTime() - now.getTime();
    setTimeout(() => {
      task();
      setInterval(task, ONE_DAY);
    }, delay);
  };

  // Initial check without logging so server startup stays clean
  void runReminderJob({ silent: true });

  // Schedule daily at 05:00
  scheduleDailyAt(5, 0, () => void runReminderJob());
};

module.exports = { startReminderJob };
