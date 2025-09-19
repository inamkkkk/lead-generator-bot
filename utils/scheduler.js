const cron = require('node-cron');
const appLogger = require('./logger');
const { runDailyLeadOutreach } = require('../services/schedulerService');

let dailyJobScheduler;

const startDailyScheduler = () => {
  if (dailyJobScheduler) {
    appLogger.warn('Daily scheduler already running. Skipping re-initialization.');
    return;
  }

  // Schedule to run daily at a specific time, e.g., 9 AM every day
  // For production, consider configurable time or dynamic scheduling.
  // '0 9 * * *' -> At 09:00 AM every day
  dailyJobScheduler = cron.schedule('0 9 * * *', async () => {
    appLogger.info('Daily lead outreach job started by scheduler.');
    try {
      await runDailyLeadOutreach();
      appLogger.info('Daily lead outreach job completed successfully via scheduler.');
    } catch (error) {
      appLogger.error('Daily lead outreach job failed via scheduler:', { 
        error: error.message, 
        stack: error.stack 
      });
      // TODO: Implement retry policy on failure from spec (currently manual retry or next day)
    }
  }, {
    scheduled: true,
    timezone: 'Etc/UTC' // Default to UTC, configure for specific timezone needs
  });

  appLogger.info('Daily lead outreach scheduler initialized (runs daily at 9:00 AM UTC).');
};

const stopDailyScheduler = () => {
  if (dailyJobScheduler) {
    dailyJobScheduler.stop();
    appLogger.info('Daily lead outreach scheduler stopped.');
    dailyJobScheduler = null;
  }
};

const getSchedulerStatus = () => {
  // This status reflects the state managed by this module, not the cron job's internal state.
  return dailyJobScheduler ? 'running' : 'stopped';
};

module.exports = {
  startDailyScheduler,
  stopDailyScheduler,
  getSchedulerStatus
};