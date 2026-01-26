const { createTagihanReminders } = require("../services/notifikasi.service");

const startReminderJob = () => {
  const fallbackMs = 6 * 60 * 60 * 1000;
  const intervalRaw = Number(process.env.REMINDER_INTERVAL_MS || fallbackMs);
  const intervalMs = Number.isNaN(intervalRaw) || intervalRaw < 60 * 1000 ? fallbackMs : intervalRaw;

  const run = async () => {
    try {
      const result = await createTagihanReminders();
      if (result?.total) {
        console.log(`Reminder job: ${result.total} notifikasi dibuat.`);
      }
    } catch (err) {
      console.error("Reminder job error:", err.message);
    }
  };

  run();
  const timer = setInterval(run, intervalMs);
  if (typeof timer.unref === "function") {
    timer.unref();
  }
};

module.exports = { startReminderJob };
