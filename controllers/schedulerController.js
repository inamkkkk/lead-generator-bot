const cron = require('node-cron');
const Job = require('../models/Job');
const Lead = require('../models/Lead');
const Log = require('../models/Log');
const { success, error } = require('../utils/apiResponse');
const appLogger = require('../utils/logger');
const { startDailyScheduler, stopDailyScheduler, getSchedulerStatus } = require('../utils/scheduler');
const { sendLeadMessage } = require('./messagingController');

const DAILY_LEAD_LIMIT = 10;

// This will store the count for the current day. Reset daily.
let dailyLeadsSentCount = 0;
let lastDailyJobDate = null;

// Reset daily counter at midnight UTC
cron.schedule('0 0 * * *', () => {
  appLogger.info('Daily lead sent count reset for new day.');
  dailyLeadsSentCount = 0;
  lastDailyJobDate = null;
}, { timezone: 'Etc/UTC' });

// Function to run the actual daily lead outreach logic
exports.runDailyLeadOutreach = async () => {
  appLogger.info('Starting daily lead outreach job...');
  let job = await Job.create({
    jobType: 'messaging',
    status: 'in_progress',
    details: { limit: DAILY_LEAD_LIMIT }
  });

  try {
    // Ensure daily count is fresh for the day this job is running
    const today = new Date().toISOString().slice(0, 10);
    if (lastDailyJobDate !== today) {
      dailyLeadsSentCount = 0;
      lastDailyJobDate = today;
      appLogger.info(`Reset daily lead count for ${today}`);
    }

    const leadsToContact = await Lead.find({
      status: 'new',
      $or: [{ email: { $ne: null } }, { phone: { $ne: null } }]
    }).limit(DAILY_LEAD_LIMIT - dailyLeadsSentCount);

    if (leadsToContact.length === 0) {
      appLogger.info('No new leads found to contact or daily limit already reached.');
      await Job.findByIdAndUpdate(job._id, { status: 'completed', leadsSent: 0, errorMessage: 'No new leads to contact or daily limit reached.' });
      return;
    }

    appLogger.info(`Found ${leadsToContact.length} new leads to contact.`);

    for (const lead of leadsToContact) {
      if (dailyLeadsSentCount >= DAILY_LEAD_LIMIT) {
        appLogger.warn(`Daily lead message limit (${DAILY_LEAD_LIMIT}) reached. Stopping outreach.`);
        break;
      }

      const channel = lead.phone ? 'whatsapp' : 'email'; // Prioritize WhatsApp if phone exists
      if (!lead.email && !lead.phone) {
        appLogger.warn(`Lead ${lead._id} has no contact info. Skipping.`);
        Log.create({ level: 'warn', module: 'Scheduler', message: `Lead ${lead._id} skipped due to no contact info.` });
        continue;
      }

      try {
        // Call sendLeadMessage directly, passing mock req/res if needed, or refactor sendLeadMessage for direct utility call
        // For simplicity, we'll call a simplified version or adjust `sendLeadMessage` to be callable without Express req/res
        // For now, simulating the call to sendLeadMessage
        appLogger.debug(`Attempting to send message to lead ${lead._id} via ${channel}`);
        const success = await exports.triggerIndividualLeadMessage(lead._id, channel);

        if (success) {
          dailyLeadsSentCount++;
          appLogger.info(`Successfully contacted lead ${lead._id} via ${channel}. Daily count: ${dailyLeadsSentCount}`);
        } else {
          appLogger.warn(`Failed to contact lead ${lead._id} via ${channel}.`);
        }

        // Introduce random delays between messages to avoid spam detection
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 3000));

      } catch (msgErr) {
        appLogger.error(`Error sending message to lead ${lead._id}: ${msgErr.message}`, { error: msgErr });
        Log.create({ level: 'error', module: 'Scheduler', message: `Failed to contact lead ${lead._id}: ${msgErr.message}`, metadata: { leadId: lead._id, channel } });
        // TODO: Implement retry policy for individual lead message failures if needed
      }
    }

    await Job.findByIdAndUpdate(job._id, { status: 'completed', leadsSent: dailyLeadsSentCount });
    appLogger.info(`Daily lead outreach job completed. ${dailyLeadsSentCount} leads contacted.`);
    Log.create({ level: 'info', module: 'Scheduler', message: `Daily outreach job completed. ${dailyLeadsSentCount} leads contacted.`, metadata: { jobId: job._id, leadsContacted: dailyLeadsSentCount } });

  } catch (err) {
    appLogger.error(`Daily lead outreach job failed: ${err.message}`, { error: err });
    await Job.findByIdAndUpdate(job._id, { status: 'failed', errorMessage: err.message });
    Log.create({ level: 'error', module: 'Scheduler', message: `Daily outreach job failed: ${err.message}`, metadata: { jobId: job._id, errorMessage: err.message } });
  }
};

// Helper to trigger an individual message, refactored from messagingController for direct use
exports.triggerIndividualLeadMessage = async (leadId, channel) => {
  // This function would encapsulate the core logic of messagingController.sendLeadMessage
  // without needing Express req/res objects. It needs access to AI, WhatsApp, Email clients.
  const lead = await Lead.findById(leadId);
  if (!lead) return false;

  // TODO: Refactor messagingController.sendLeadMessage to be a utility function
  // that accepts (lead, channel, templateId, variables) and returns success/failure.
  // For now, simulate success.

  // Placeholder for the actual messaging logic from messagingController
  try {
    let messageContent;
    const geminiModel = getGeminiModel();
    if (geminiModel) {
      const prompt = `Generate a short introductory message for ${lead.name} via ${channel} to explain our lead generation service.`;
      const result = await geminiModel.generateContent(prompt);
      messageContent = (await result.response).text();
    } else {
      messageContent = `Hi ${lead.name || 'there'}, we'd love to tell you about our lead generation bot!`;
    }

    if (channel === 'whatsapp' && lead.phone) {
      await sendWhatsAppMessage(lead.phone, messageContent);
      lead.status = 'contacted';
      lead.lastContacted = new Date();
      await lead.save();
      await Response.create({ leadId: lead._id, channel, direction: 'outgoing', messageContent, status: 'sent' });
      return true;
    } else if (channel === 'email' && lead.email) {
      await sendEmail(lead.email, 'Unlock New Business Opportunities', messageContent);
      lead.status = 'contacted';
      lead.lastContacted = new Date();
      await lead.save();
      await Response.create({ leadId: lead._id, channel, direction: 'outgoing', messageContent, status: 'sent' });
      return true;
    } else {
      appLogger.warn(`Skipping lead ${lead._id}: no valid contact info for ${channel}.`);
      return false;
    }
  } catch (err) {
    appLogger.error(`Failed to trigger message for lead ${lead._id} via ${channel}: ${err.message}`);
    return false;
  }
};

// @desc    Manually trigger the daily lead outreach job
// @route   POST /api/scheduler/start-daily-job
// @access  Public (for administrative override)
exports.triggerDailyJobManually = async (req, res) => {
  try {
    appLogger.info('Manual trigger for daily lead outreach job received.');
    // Run in background, don't await here to avoid blocking response
    exports.runDailyLeadOutreach();
    success(res, 202, 'Daily lead outreach job manually triggered. Check job status for updates.');
  } catch (err) {
    appLogger.error(`Failed to manually trigger daily job: ${err.message}`, { error: err });
    error(res, 500, 'Failed to manually trigger daily job', err.message);
  }
};

// @desc    Get the status of the scheduler and last daily job
// @route   GET /api/scheduler/status
// @access  Public
exports.getSchedulerAndJobStatus = async (req, res) => {
  try {
    const schedulerRunning = getSchedulerStatus();
    const lastDailyJob = await Job.findOne({ jobType: 'messaging' }).sort({ date: -1 });

    success(res, 200, 'Scheduler status retrieved', {
      schedulerStatus: schedulerRunning,
      dailyLeadsSentToday: dailyLeadsSentCount,
      lastDailyJob: lastDailyJob || null,
      dailyLimit: DAILY_LEAD_LIMIT,
    });
  } catch (err) {
    appLogger.error(`Failed to get scheduler status: ${err.message}`, { error: err });
    error(res, 500, 'Failed to get scheduler status', err.message);
  }
};

// @desc    Stop the daily scheduler
// @route   POST /api/scheduler/stop
// @access  Public
exports.stopScheduler = async (req, res) => {
  stopDailyScheduler();
  success(res, 200, 'Daily scheduler stopped.');
};

// @desc    Start the daily scheduler
// @route   POST /api/scheduler/start
// @access  Public
exports.startScheduler = async (req, res) => {
  startDailyScheduler();
  success(res, 200, 'Daily scheduler started.');
};

// Helper to get daily leads sent count
exports.getDailyLeadsSentCount = async () => {
  // Ensure we are tracking for the current day. If not, reset.
  const today = new Date().toISOString().slice(0, 10);
  if (lastDailyJobDate !== today) {
    dailyLeadsSentCount = 0;
    lastDailyJobDate = today;
  }
  return dailyLeadsSentCount;
};

// Helper to increment daily leads sent count
exports.incrementDailyLeadsSentCount = async () => {
  dailyLeadsSentCount++;
};

// Start the scheduler on application boot (only once)
process.nextTick(() => {
  startDailyScheduler();
});
