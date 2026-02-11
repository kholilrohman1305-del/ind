const app = require("./app");
const { startReminderJob } = require("./jobs/reminder.job");

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is live on port ${PORT}`);
  startReminderJob();
});
