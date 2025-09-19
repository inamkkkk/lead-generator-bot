const mongoose = require('mongoose');

const SummarySchema = new mongoose.Schema({
  leadId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Lead',
    required: true,
    unique: true, // Ensures one summary per lead
  },
  conversationSummary: {
    type: String,
    required: true,
  },
  keyPoints: {
    type: [String],
    default: [],
  },
}, { timestamps: true }); // timestamps: true adds createdAt and updatedAt fields

module.exports = mongoose.model('Summary', SummarySchema);