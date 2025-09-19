const mongoose = require('mongoose');

const LogSchema = new mongoose.Schema({
  level: {
    type: String,
    enum: ['info', 'warn', 'error', 'debug', 'critical'],
    default: 'info',
  },
  module: {
    type: String,
    required: true,
    trim: true,
  },
  message: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
  metadata: mongoose.Schema.Types.Mixed, // Any additional data like error stack, leadId, jobId etc.
}, { timestamps: true });

module.exports = mongoose.model('Log', LogSchema);
