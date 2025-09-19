const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  jobType: {
    type: String,
    enum: ['scraper', 'messaging', 'summary'],
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled'],
    default: 'pending',
  },
  leadsProcessed: {
    type: Number,
    default: 0,
  },
  leadsSent: {
    type: Number,
    default: 0,
  },
  errorMessage: {
    type: String,
  },
  details: mongoose.Schema.Types.Mixed, // Store job-specific details (e.g., scraper source, messaging channel)
}, { timestamps: true });

module.exports = mongoose.model('Job', JobSchema);