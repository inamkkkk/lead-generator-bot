const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    index: true,
  },
  channel: {
    type: String,
    enum: ['whatsapp', 'email'],
    required: true,
  },
  direction: {
    type: String,
    enum: ['incoming', 'outgoing'],
    required: true,
  },
  messageContent: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'received', 'failed'],
    required: true, // Status must be explicitly set, as the initial state depends on the 'direction'.
  },
  externalMessageId: {
    type: String, // ID from the external service (e.g., WhatsApp, SendGrid)
    index: true,  // For efficient lookup, e.g., via webhooks.
  }
}, {
  // This option adds `createdAt` and `updatedAt` fields, making a separate `timestamp` field redundant.
  timestamps: true
});

module.exports = mongoose.model('Response', ResponseSchema);