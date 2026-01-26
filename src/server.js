const app = require("./app");
const { startReminderJob } = require("./jobs/reminder.job");

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  startReminderJob();
});
