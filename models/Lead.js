const mongoose = require('mongoose');

const LeadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    lowercase: true,
    sparse: true, // Allows null values, but ensures unique non-null values
    // validate: { // Example of custom validation, Joi in middleware is preferred for API input
    //   validator: function(v) { return v === null || /^[\w-]+(?:\.[\w-]+)*@(?:[\w-]+\.)+[a-zA-Z]{2,7}$/.test(v); },
    //   message: props => `${props.value} is not a valid email address!`
    // }
  },
  phone: {
    type: String,
    trim: true,
    sparse: true, // Allows null values, but ensures unique non-null values
    // validate: { // Example of custom validation
    //   validator: function(v) { return v === null || /^\+?[1-9]\d{1,14}$/.test(v); }, // E.164 format
    //   message: props => `${props.value} is not a valid phone number!`
    // }
  },
  status: {
    type: String,
    enum: ['new', 'contacted', 'replied', 'qualified', 'unqualified'],
    default: 'new',
  },
  sourceURL: {
    type: String,
    required: true,
    trim: true,
  },
  dateScraped: {
    type: Date,
    default: Date.now,
  },
  lastContacted: {
    type: Date,
  },
  notes: {
    type: String,
    trim: true,
  }
}, { timestamps: true });

// Ensure unique combination of email/phone, or if one is present, it's unique
LeadSchema.index({ email: 1 }, { unique: true, partialFilterExpression: { email: { $exists: true, $ne: null } } });
LeadSchema.index({ phone: 1 }, { unique: true, partialFilterExpression: { phone: { $exists: true, $ne: null } } });

module.exports = mongoose.model('Lead', LeadSchema);
