const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    unique: true, // Only one summary per lead for now, can be array if multiple summaries are needed
  },
  conversationSummary: {
    type: String,
    required: true,
  },
  keyPoints: {
    type: [String],
    default: [],
  },
  lastUpdatedAt: {
    type: Date,
    default: Date.now,
  },
}, { timestamps: true });

module.exports = mongoose.model('Summary', SummarySchema);
