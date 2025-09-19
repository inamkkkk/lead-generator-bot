const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const appLogger = require('./logger');
const Lead = require('../models/Lead');
const Response = require('../models/Response');
const Log = require('../models/Log');
const { handleIncomingWhatsAppMessage } = require('../controllers/messagingController'); // Import the handler

let whatsappClient;
let clientReady = false;

const initializeWhatsappClient = () => {
  if (whatsappClient) {
    appLogger.info('WhatsApp client already initialized.');
    return whatsappClient;
  }

  whatsappClient = new Client({
    authStrategy: new LocalAuth({
      dataPath: process.env.WHATSAPP_SESSION_PATH || './.wwebjs_auth'
    }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    }
  });

  whatsappClient.on('qr', (qr) => {
    appLogger.info('WhatsApp QR Code received, scan it in the terminal:');
    qrcode.generate(qr, { small: true });
    Log.create({ level: 'info', module: 'WhatsApp', message: 'QR Code generated for login.' });
  });

  whatsappClient.on('ready', () => {
    appLogger.info('WhatsApp Client is ready!');
    clientReady = true;
    Log.create({ level: 'info', module: 'WhatsApp', message: 'WhatsApp Client ready.' });
  });

  whatsappClient.on('authenticated', () => {
    appLogger.info('WhatsApp Client authenticated!');
    Log.create({ level: 'info', module: 'WhatsApp', message: 'WhatsApp Client authenticated.' });
  });

  whatsappClient.on('auth_failure', (msg) => {
    appLogger.error('WhatsApp Auth failure!', { message: msg });
    clientReady = false;
    Log.create({ level: 'error', module: 'WhatsApp', message: `Auth failure: ${msg}` });
  });

  whatsappClient.on('disconnected', (reason) => {
    appLogger.warn('WhatsApp Client was disconnected!', { reason });
    clientReady = false;
    Log.create({ level: 'warn', module: 'WhatsApp', message: `Client disconnected: ${reason}` });
    // Attempt to re-initialize or log for manual intervention
    setTimeout(() => {
      appLogger.info('Attempting to re-initialize WhatsApp client...');
      whatsappClient.initialize();
    }, 5000);
  });

  whatsappClient.on('message', async (msg) => {
    if (msg.fromMe) return; // Ignore messages sent by the bot itself

    const contact = await msg.getContact();
    const phoneNumber = contact.number; // Phone number without country code usually
    const fullPhoneNumber = contact.id.user + '@c.us'; // E.164 format for comparison (e.g. 1234567890@c.us)

    appLogger.info(`Incoming WhatsApp message from ${phoneNumber}: ${msg.body}`);

    // Check if the sender is a known lead (matching by phone number)
    const lead = await Lead.findOne({ phone: new RegExp(`^\+?${phoneNumber.replace(/\D/g,'')}$`) });

    if (lead) {
      appLogger.info(`Incoming message from known lead: ${lead.name} (${phoneNumber})`);
      // Log incoming message
      await Response.create({
        leadId: lead._id,
        channel: 'whatsapp',
        direction: 'incoming',
        messageContent: msg.body,
        externalMessageId: msg.id.id,
        status: 'received'
      });

      // Pass to controller for AI processing and reply logic
      handleIncomingWhatsAppMessage(whatsappClient, lead, msg);

    } else {
      // Rule: ignore or log without response for unknown leads
      appLogger.warn(`Incoming WhatsApp message from unknown number ${phoneNumber}. Ignoring.`);
      await Log.create({
        level: 'warn',
        module: 'WhatsApp',
        message: `Incoming message from unknown number. Ignoring.`, 
        metadata: { from: phoneNumber, message: msg.body }
      });
    }
  });

  // Handle typing indicators (optional)
  whatsappClient.on('message_create', async (msg) => {
    if (msg.fromMe && msg.type === 'chat') {
      const chat = await msg.getChat();
      // Not strictly 'typing', but could be used to indicate bot activity
      // chat.sendStateTyping(); // This usually implies an active chat, not specific to message_create
    }
  });

  whatsappClient.initialize();
  return whatsappClient;
};

const getWhatsappClient = () => whatsappClient;
const isWhatsappClientReady = () => clientReady;

const sendWhatsAppMessage = async (to, message) => {
  if (!clientReady) {
    throw new Error('WhatsApp client is not ready. Please initialize and wait for it to be ready.');
  }
  try {
    // Ensure 'to' is in the correct format (e.g., '1234567890@c.us')
    const chatId = to.includes('@c.us') ? to : `${to.replace(/\D/g, '')}@c.us`;
    await whatsappClient.sendMessage(chatId, message);
    appLogger.info(`WhatsApp message sent to ${chatId}`);
    return true;
  } catch (error) {
    appLogger.error(`Failed to send WhatsApp message to ${to}: ${error.message}`, { error: error });
    throw error;
  }
};

module.exports = {
  initializeWhatsappClient,
  getWhatsappClient,
  isWhatsappClientReady,
  sendWhatsAppMessage,
};
