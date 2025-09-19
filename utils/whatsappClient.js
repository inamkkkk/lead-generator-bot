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
    },
    // FFMPEG is required for processing video/audio
    ffmpegPath: process.env.FFMPEG_PATH,
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
    
    // Attempt to re-initialize after a delay
    setTimeout(() => {
      appLogger.info('Attempting to re-initialize WhatsApp client...');
      whatsappClient.initialize().catch(err => {
        appLogger.error('Re-initialization failed after disconnection.', { error: err.message });
        // TODO: Implement more robust recovery logic, e.g., exponential backoff or alerting.
      });
    }, 15000); // Increased delay for recovery
  });

  whatsappClient.on('message', async (msg) => {
    // Ignore messages sent by the bot itself or status updates
    if (msg.fromMe || msg.from === 'status@broadcast') {
      return;
    }

    const chatId = msg.from; // e.g., '1234567890@c.us'
    const phoneNumber = chatId.split('@')[0];

    appLogger.info(`Incoming WhatsApp message from ${phoneNumber}: "${msg.body}"`);
    
    try {
      // Find a lead where the phone number matches.
      // This regex handles cases where the DB might store numbers with or without a '+' prefix.
      const lead = await Lead.findOne({ phone: new RegExp(`^\\+?${phoneNumber}$`) });

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
    } catch (error) {
      appLogger.error('Error processing incoming WhatsApp message.', { error: error.message, from: phoneNumber });
      await Log.create({
        level: 'error',
        module: 'WhatsApp',
        message: 'Error processing incoming WhatsApp message.',
        metadata: { from: phoneNumber, message: msg.body, error: error.message }
      });
    }
  });

  whatsappClient.initialize().catch(err => {
    appLogger.error('Failed to initialize WhatsApp client.', { error: err.message });
  });

  return whatsappClient;
};

const getWhatsappClient = () => whatsappClient;
const isWhatsappClientReady = () => clientReady;

const sendWhatsAppMessage = async (to, message) => {
  if (!isWhatsappClientReady()) {
    const errorMessage = 'WhatsApp client is not ready. Cannot send message.';
    appLogger.error(errorMessage);
    throw new Error(errorMessage);
  }
  try {
    // Ensure 'to' is in the correct format (e.g., '1234567890@c.us')
    const chatId = to.includes('@c.us') ? to : `${to.replace(/\D/g, '')}@c.us`;
    const sentMessage = await whatsappClient.sendMessage(chatId, message);
    appLogger.info(`WhatsApp message sent to ${chatId}`);
    return sentMessage;
  } catch (error) {
    appLogger.error(`Failed to send WhatsApp message to ${to}.`, { error: error.message, stack: error.stack });
    // Re-throw the error so the caller can handle it
    throw error;
  }
};

module.exports = {
  initializeWhatsappClient,
  getWhatsappClient,
  isWhatsappClientReady,
  sendWhatsAppMessage,
};