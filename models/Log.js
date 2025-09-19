const { Schema, model } = require('mongoose');

const LogSchema = new Schema({
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
  metadata: {
    type: Schema.Types.Mixed, // Any additional data like error stack, leadId, jobId etc.
  },
}, { timestamps: true });

module.exports = model('Log', LogSchema);