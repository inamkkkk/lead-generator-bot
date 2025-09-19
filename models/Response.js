const mongoose = require('mongoose');

const ResponseSchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
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
  timestamp: {
    type: Date,
    default: Date.now,
  },
  status: {
    type: String,
    enum: ['sent', 'received', 'failed'],
    default: 'sent', // For outgoing messages
  },
  externalMessageId: {
    type: String, // ID from WhatsApp or Email service
  }
}, { timestamps: true });

module.exports = mongoose.model('Response', ResponseSchema);
