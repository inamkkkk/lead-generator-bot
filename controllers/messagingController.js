const Lead = require('../models/Lead');
const Response = require('../models/Response');
const Job = require('../models/Job');
const Log = require('../models/Log');
const { success, error } = require('../utils/apiResponse');
const appLogger = require('../utils/logger');
const { initializeWhatsappClient, getWhatsappClient, isWhatsappClientReady, sendWhatsAppMessage } = require('../utils/whatsappClient');
const { initializeEmailClient, sendEmail } = require('../utils/emailClient');
const { getGeminiModel } = require('../utils/geminiClient');
const { getDailyLeadsSentCount, incrementDailyLeadsSentCount } = require('./schedulerController'); // To check daily limit

const DAILY_MESSAGE_LIMIT = 10;

// @desc    Initialize WhatsApp session
// @route   POST /api/messaging/whatsapp/init
// @access  Public (for initial setup)
exports.initWhatsAppSession = async (req, res) => {
  try {
    const client = initializeWhatsappClient();
    if (client) {
      success(res, 200, 'WhatsApp client initialization started. Scan QR if shown in terminal.', { status: 'initializing' });
    } else {
      error(res, 500, 'Failed to start WhatsApp client initialization.');
    }
  } catch (err) {
    appLogger.error(`Error initializing WhatsApp client: ${err.message}`, { error: err });
    error(res, 500, 'Error initializing WhatsApp client', err.message);
  }
};

// @desc    Get WhatsApp client status
// @route   GET /api/messaging/whatsapp/status
// @access  Public
exports.getWhatsAppStatus = async (req, res) => {
  const clientReady = isWhatsappClientReady();
  success(res, 200, 'WhatsApp client status retrieved', { status: clientReady ? 'ready' : 'not_ready' });
};

// @desc    Send a message to a lead (WhatsApp or Email)
// @route   POST /api/messaging/send
// @access  Public (for internal bot use)
exports.sendLeadMessage = async (req, res) => {
  const { leadId, channel, templateId, variables } = req.validatedBody;

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return error(res, 404, 'Lead not found.');
    }

    if (await getDailyLeadsSentCount() >= DAILY_MESSAGE_LIMIT) {
      return error(res, 429, `Daily message limit of ${DAILY_MESSAGE_LIMIT} reached. Cannot send more messages today.`);
    }

    // TODO: Generate personalized message using AI (Gemini) based on templateId and variables
    // This should ideally happen in aiController or a dedicated service, then passed here.
    const geminiModel = getGeminiModel();
    let messageContent = `Hello ${lead.name || 'there'}! This is a placeholder message.`;

    if (geminiModel) {
      // Placeholder for AI message generation. In reality, you'd pass templateId and variables.
      // For example: await aiController.generatePersonalizedMessageLogic(lead, templateId, variables);
      const prompt = `Generate a personalized ${channel} outreach message for a lead named ${lead.name || 'Lead'}. Their email is ${lead.email || 'not provided'} and phone is ${lead.phone || 'not provided'}. The purpose is to introduce our service and invite for a demo. Keep it business-friendly and natural.`;
      try {
        const result = await geminiModel.generateContent(prompt);
        const response = await result.response;
        messageContent = response.text();
        appLogger.info('AI generated message for lead.', { leadId, channel });
      } catch (aiError) {
        appLogger.error(`Failed to generate AI message for lead ${leadId}: ${aiError.message}`, { error: aiError });
        messageContent = `Hello ${lead.name || 'there'}! We tried to reach out regarding an opportunity. Please let us know if you're interested!`; // Fallback
      }
    } else {
      appLogger.warn('Gemini client not available. Using fallback message.');
    }

    let messageSent = false;
    if (channel === 'whatsapp') {
      if (!isWhatsappClientReady()) {
        return error(res, 503, 'WhatsApp client is not ready. Cannot send message.');
      }
      if (!lead.phone) {
        return error(res, 400, 'Lead does not have a phone number for WhatsApp.');
      }
      await sendWhatsAppMessage(lead.phone, messageContent);
      messageSent = true;
    } else if (channel === 'email') {
      initializeEmailClient(); // Ensure email client is ready
      if (!lead.email) {
        return error(res, 400, 'Lead does not have an email address.');
      }
      await sendEmail(lead.email, 'Exciting Opportunity for Your Business', messageContent);
      messageSent = true;
    }

    if (messageSent) {
      await Response.create({
        leadId: lead._id,
        channel,
        direction: 'outgoing',
        messageContent,
        status: 'sent',
      });

      lead.status = 'contacted';
      lead.lastContacted = new Date();
      await lead.save();

      await incrementDailyLeadsSentCount();

      success(res, 200, `Message sent to lead ${lead.name} via ${channel}`, { leadId: lead._id, channel });
    } else {
      error(res, 500, 'Failed to send message: channel not supported or not ready.');
    }

  } catch (err) {
    appLogger.error(`Failed to send message to lead ${leadId} via ${channel}: ${err.message}`, { error: err });
    error(res, 500, 'Failed to send message', err.message);
  }
};

// Helper for incoming WhatsApp messages, called by whatsappClient.js
exports.handleIncomingWhatsAppMessage = async (whatsappClient, lead, msg) => {
  appLogger.info(`Processing incoming WhatsApp message for lead ${lead._id}`);

  // Rule: only reply to leads that already exist in its database
  // This check is already done in whatsappClient.js before calling this handler.

  // TODO: Implement AI-driven reply logic here
  // Steps:
  // 1. Use Gemini AI to analyze 'msg.body' in context of previous 'Response' history for this lead.
  // 2. Potentially update 'Lead' status, or create/update 'Summary' for the conversation.
  // 3. Generate a natural, business-friendly response using Gemini AI.
  // 4. Send the reply using 'whatsappClient.sendMessage' with random delays and potentially rotating templates.
  // 5. Log the outgoing reply in the 'Response' collection.

  const geminiModel = getGeminiModel();
  if (!geminiModel) {
    appLogger.warn('Gemini client not initialized. Cannot generate AI reply for incoming message.');
    return Log.create({ level: 'warn', module: 'Messaging', message: 'Gemini not ready for incoming message processing.', metadata: { leadId: lead._id } });
  }

  try {
    // Simulate AI typing indicator (if whatsapp-web.js supports it directly on chat object, or manual delay)
    const chat = await msg.getChat();
    chat.sendStateTyping();
    await new Promise(resolve => setTimeout(resolve, Math.random() * 2000 + 1000)); // Random delay

    const conversationHistory = await Response.find({ leadId: lead._id, channel: 'whatsapp' }).sort({ timestamp: 1 }).limit(10);
    const formattedHistory = conversationHistory.map(r => `${r.direction === 'outgoing' ? 'Bot' : 'Lead'}: ${r.messageContent}`).join('\n');

    const aiPrompt = `The lead '${lead.name}' sent the following message: "${msg.body}". 
Conversation history:
${formattedHistory}

Based on this, craft a natural and business-friendly WhatsApp reply. Keep it concise and aimed at progressing the conversation.`;

    const result = await geminiModel.generateContent(aiPrompt);
    const response = await result.response;
    const aiReply = response.text();

    await sendWhatsAppMessage(msg.from, aiReply);
    appLogger.info(`AI replied to lead ${lead._id} via WhatsApp.`);

    await Response.create({
      leadId: lead._id,
      channel: 'whatsapp',
      direction: 'outgoing',
      messageContent: aiReply,
      status: 'sent',
    });

    // Update lead status if appropriate, e.g., 'replied'
    if (lead.status === 'contacted' || lead.status === 'new') {
      lead.status = 'replied';
      await lead.save();
    }

    chat.clearState(); // Clear typing indicator

  } catch (aiError) {
    appLogger.error(`Failed to generate AI reply for lead ${lead._id}: ${aiError.message}`, { error: aiError });
    await Log.create({ level: 'error', module: 'Messaging', message: `Failed to AI reply to lead ${lead._id}: ${aiError.message}`, metadata: { leadId: lead._id } });
    // Optionally send a generic fallback reply or just log
    // await sendWhatsAppMessage(msg.from, "I'm sorry, I couldn't process your request right now. Please try again later.");
  }
};

// TODO: Implement handling for incoming emails (e.g., via webhook or polling an inbox)
// This would involve setting up an email server to receive emails or a service like Mailgun/SendGrid webhooks.
exports.handleIncomingEmail = async (emailData) => {
  appLogger.info('TODO: Implement incoming email handling.');
  // Steps:
  // 1. Parse incoming email 'emailData' (from webhook or polled inbox).
  // 2. Identify sender's email address.
  // 3. Look up 'Lead' by email address.
  // 4. If known lead, log message in 'Response' collection.
  // 5. Use Gemini AI for natural, business-friendly reply generation.
  // 6. Send reply via 'sendEmail' utility.
  // 7. If unknown, log without response as per rules.
  Log.create({ level: 'info', module: 'Messaging', message: 'Incoming email processing stub.', metadata: { emailData: emailData } });
};
