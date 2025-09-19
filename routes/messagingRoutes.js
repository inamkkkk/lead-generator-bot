const express = require('express');
const router = express.Router();
const messagingController = require('../controllers/messagingController');
const { validate, messagingValidationSchemas } = require('../middlewares/validationMiddleware');

// Route to initialize WhatsApp session (generates QR code)
router.post('/whatsapp/init', messagingController.initWhatsAppSession);

// Route to get WhatsApp client status
router.get('/whatsapp/status', messagingController.getWhatsAppStatus);

// Route to send a message to a specific lead via a channel
router.post('/send', validate(messagingValidationSchemas.sendMessage), messagingController.sendLeadMessage);

// Note: Incoming messages are handled by the whatsappClient.js utility itself
// and passed to messagingController.handleIncomingWhatsAppMessage for processing,
// so no explicit incoming route is needed here.

module.exports = router;
