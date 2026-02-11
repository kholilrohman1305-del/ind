const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "..", "startup.log");
const log = (msg) => {
  const line = `[${new Date().toISOString()}] ${msg}\n`;
  fs.appendFileSync(logFile, line);
};

try {
  log("Starting server...");
  const app = require("./app");
  const { startReminderJob } = require("./jobs/reminder.job");

  const PORT = process.env.PORT || 3000;

  app.listen(PORT, "0.0.0.0", () => {
    log(`Server is live on port ${PORT}`);
    console.log(`Server is live on port ${PORT}`);
    startReminderJob();
  });
} catch (err) {
  log(`FATAL: ${err.stack || err.message || err}`);
  process.exit(1);
}

process.on("uncaughtException", (err) => {
  log(`UNCAUGHT: ${err.stack || err.message}`);
});

process.on("unhandledRejection", (reason) => {
  log(`UNHANDLED REJECTION: ${reason}`);
});
