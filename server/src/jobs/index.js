const { scheduleBackups } = require('./backupJob');
const { scheduleReminders } = require('./reminderJob');

function registerJobs() {
  scheduleBackups();
  scheduleReminders();
}

module.exports = { registerJobs };
