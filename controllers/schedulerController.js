const cron = require('node-cron');
const Job = require('../models/Job');
const Lead = require('../models/Lead');
const Log = require('../models/Log');
const Response = require('../models/Response');
const { success, error } = require('../utils/apiResponse');
const appLogger = require('../utils/logger');
const { startDailyScheduler, stopDailyScheduler, getSchedulerStatus } = require('../utils/scheduler');
const { getGeminiModel } = require('../services/aiService');
const { sendWhatsAppMessage } = require('../services/whatsappService');
const { sendEmail } = require('../services/emailService');


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

// Helper to trigger an individual message, refactored for direct use
const triggerIndividualLeadMessage = async (leadId, channel) => {
  const lead = await Lead.findById(leadId);
  if (!lead) {
    appLogger.warn(`Lead not found for ID: ${leadId} in triggerIndividualLeadMessage`);
    return false;
  }

  // TODO: Refactor messagingController.sendLeadMessage to be a utility function
  // that accepts (lead, channel, templateId, variables) and returns success/failure.
  // For now, simulate success.

  try {
    let messageContent;
    const geminiModel = getGeminiModel();
    if (geminiModel) {
      const prompt = `Generate a short introductory message for ${lead.name} via ${channel} to explain our lead generation service.`;
      const result = await geminiModel.generateContent(prompt);
      const response = result.response;
      messageContent = response.text();
    } else {
      messageContent = `Hi ${lead.name || 'there'}, we'd love to tell you about our lead generation bot!`;
    }

    if (channel === 'whatsapp' && lead.phone) {
      await sendWhatsAppMessage(lead.phone, messageContent);
    } else if (channel === 'email' && lead.email) {
      await sendEmail(lead.email, 'Unlock New Business Opportunities', messageContent);
    } else {
      appLogger.warn(`Skipping lead ${lead._id}: no valid contact info for channel ${channel}.`);
      return false;
    }

    lead.status = 'contacted';
    lead.lastContacted = new Date();

    await Promise.all([
      lead.save(),
      Response.create({ leadId: lead._id, channel, direction: 'outgoing', messageContent, status: 'sent' })
    ]);

    return true;
  } catch (err) {
    appLogger.error(`Failed to trigger message for lead ${lead._id} via ${channel}: ${err.message}`, { error: err });
    return false;
  }
};


// Function to run the actual daily lead outreach logic
exports.runDailyLeadOutreach = async () => {
  appLogger.info('Starting daily lead outreach job...');
  const job = await Job.create({
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

    if (dailyLeadsSentCount >= DAILY_LEAD_LIMIT) {
        appLogger.info('Daily limit already reached before starting outreach. No new leads will be contacted.');
        await Job.findByIdAndUpdate(job._id, { status: 'completed', leadsSent: 0, errorMessage: 'Daily limit reached before job start.' });
        return;
    }

    const leadsToContact = await Lead.find({
      status: 'new',
      $or: [{ email: { $ne: null, $ne: '' } }, { phone: { $ne: null, $ne: '' } }]
    }).limit(DAILY_LEAD_LIMIT - dailyLeadsSentCount);

    if (leadsToContact.length === 0) {
      appLogger.info('No new leads found to contact.');
      await Job.findByIdAndUpdate(job._id, { status: 'completed', leadsSent: 0, errorMessage: 'No new leads to contact.' });
      return;
    }

    appLogger.info(`Found ${leadsToContact.length} new leads to contact.`);
    let leadsSuccessfullySent = 0;

    for (const lead of leadsToContact) {
      if (dailyLeadsSentCount >= DAILY_LEAD_LIMIT) {
        appLogger.warn(`Daily lead message limit (${DAILY_LEAD_LIMIT}) reached. Stopping outreach.`);
        break;
      }

      const channel = lead.phone ? 'whatsapp' : 'email'; // Prioritize WhatsApp if phone exists

      try {
        appLogger.debug(`Attempting to send message to lead ${lead._id} via ${channel}`);
        const sentSuccessfully = await triggerIndividualLeadMessage(lead._id, channel);

        if (sentSuccessfully) {
          dailyLeadsSentCount++;
          leadsSuccessfullySent++;
          appLogger.info(`Successfully contacted lead ${lead._id} via ${channel}. Daily count: ${dailyLeadsSentCount}`);
        } else {
          appLogger.warn(`Failed to contact lead ${lead._id} via ${channel}.`);
        }

        // Introduce random delays between messages to avoid spam detection
        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 3000));

      } catch (msgErr) {
        appLogger.error(`Error sending message to lead ${lead._id}: ${msgErr.message}`, { error: msgErr });
        await Log.create({ level: 'error', module: 'Scheduler', message: `Failed to contact lead ${lead._id}: ${msgErr.message}`, metadata: { leadId: lead._id, channel } });
        // TODO: Implement retry policy for individual lead message failures if needed
      }
    }

    await Job.findByIdAndUpdate(job._id, { status: 'completed', 'details.leadsSent': leadsSuccessfullySent });
    appLogger.info(`Daily lead outreach job completed. ${leadsSuccessfullySent} leads contacted in this run. Total today: ${dailyLeadsSentCount}`);
    await Log.create({ level: 'info', module: 'Scheduler', message: `Daily outreach job completed. ${leadsSuccessfullySent} leads contacted.`, metadata: { jobId: job._id, leadsContacted: leadsSuccessfullySent } });

  } catch (err) {
    appLogger.error(`Daily lead outreach job failed: ${err.message}`, { error: err });
    await Job.findByIdAndUpdate(job._id, { status: 'failed', errorMessage: err.message });
    await Log.create({ level: 'error', module: 'Scheduler', message: `Daily outreach job failed: ${err.message}`, metadata: { jobId: job._id, errorMessage: err.message } });
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
    const lastDailyJob = await Job.findOne({ jobType: 'messaging' }).sort({ createdAt: -1 });

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
exports.stopScheduler = (req, res) => {
  stopDailyScheduler();
  success(res, 200, 'Daily scheduler stopped.');
};

// @desc    Start the daily scheduler
// @route   POST /api/scheduler/start
// @access  Public
exports.startScheduler = (req, res) => {
  startDailyScheduler();
  success(res, 200, 'Daily scheduler started.');
};

// Start the scheduler on application boot (only once)
process.nextTick(() => {
  startDailyScheduler();
});