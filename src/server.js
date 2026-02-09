const fs = require("fs");
const path = require("path");

// Log errors to file for debugging on hosting
const logFile = path.join(__dirname, "..", "startup.log");
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
  console.log(msg);
};

process.on("uncaughtException", (err) => {
  log(`UNCAUGHT EXCEPTION: ${err.stack || err.message}`);
  process.exit(1);
});

process.on("unhandledRejection", (err) => {
  log(`UNHANDLED REJECTION: ${err.stack || err.message}`);
});

try {
  log("Starting app...");
  const app = require("./app");
  const { startReminderJob } = require("./jobs/reminder.job");

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, () => {
    log(`Server is live on port ${PORT}`);
    startReminderJob();
  });
} catch (err) {
  log(`STARTUP ERROR: ${err.stack || err.message}`);
  process.exit(1);
}