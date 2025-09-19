const Joi = require('joi');
const appLogger = require('../utils/logger');

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, allowUnknown: true });

  if (error) {
    const errors = error.details.map((detail) => ({
      field: detail.path.join('.'),
      message: detail.message,
    }));
    appLogger.warn('Validation error occurred.', { errors });
    return res.status(400).json({
      status: 'error',
      statusCode: 400,
      message: 'Validation failed',
      details: errors,
    });
  }

  req.validatedBody = value;
  next();
};

// Specific schemas for different routes
const leadValidationSchemas = {
  createLead: Joi.object({
    name: Joi.string().trim().required().messages({ 'any.required': 'Lead name is required.' }),
    email: Joi.string().email().trim().allow(null, '').optional().messages({ 'string.email': 'Please provide a valid email address.' }),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).trim().allow(null, '').optional().messages({ 'string.pattern.base': 'Please provide a valid phone number (E.164 format).' }),
    sourceURL: Joi.string().uri().required().messages({ 'any.required': 'Source URL is required.', 'string.uri': 'Source URL must be a valid URI.' }),
    status: Joi.string().valid('new', 'contacted', 'replied', 'qualified', 'unqualified').optional(),
    notes: Joi.string().trim().optional().allow(''),
  }).xor('email', 'phone').messages({
    'object.xor': 'Either email or phone must be provided.'
  }),

  updateLead: Joi.object({
    name: Joi.string().trim().optional(),
    email: Joi.string().email().trim().allow(null, '').optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).trim().allow(null, '').optional(),
    status: Joi.string().valid('new', 'contacted', 'replied', 'qualified', 'unqualified').optional(),
    sourceURL: Joi.string().uri().optional(),
    lastContacted: Joi.date().iso().optional(),
    notes: Joi.string().trim().optional().allow(''),
  }).min(1).messages({ 'object.min': 'At least one field must be provided for update.' }),
};

const scraperValidationSchemas = {
  startScrape: Joi.object({
    sources: Joi.array().items(Joi.string().valid('websites', 'business directories', 'google maps')).min(1).required().messages({ 'any.required': 'At least one scraper source is required.', 'array.min': 'At least one scraper source is required.' }),
    keywords: Joi.string().trim().required().messages({ 'any.required': 'Scraping keywords are required.' }),
    location: Joi.string().trim().optional().allow(''),
    limit: Joi.number().integer().min(1).max(500).default(50),
  })
};

const messagingValidationSchemas = {
  sendMessage: Joi.object({
    leadId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({ 'any.required': 'Lead ID is required.', 'string.pattern.base': 'Lead ID must be a valid MongoDB ObjectId.' }),
    channel: Joi.string().valid('whatsapp', 'email').required().messages({ 'any.required': 'Messaging channel is required.' }),
    templateId: Joi.string().required().messages({ 'any.required': 'Message template ID is required.' }), // TODO: Validate this against existing template IDs
    variables: Joi.object().optional(), // For template personalization
  })
};

const aiValidationSchemas = {
  generateMessage: Joi.object({
    leadId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({ 'any.required': 'Lead ID is required.', 'string.pattern.base': 'Lead ID must be a valid MongoDB ObjectId.' }),
    context: Joi.string().required().messages({ 'any.required': 'Context for message generation is required.' }),
    purpose: Joi.string().required().messages({ 'any.required': 'Purpose of the message is required.' }),
  }),
  summarizeConversation: Joi.object({
    leadId: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required().messages({ 'any.required': 'Lead ID is required.', 'string.pattern.base': 'Lead ID must be a valid MongoDB ObjectId.' }),
    conversationHistory: Joi.array().items(Joi.object({
      sender: Joi.string().valid('bot', 'lead').required(),
      message: Joi.string().required(),
      timestamp: Joi.date().iso().required(),
    })).min(1).required().messages({ 'any.required': 'Conversation history is required for summarization.', 'array.min': 'Conversation history cannot be empty.' }),
  })
};

module.exports = {
  validate,
  leadValidationSchemas,
  scraperValidationSchemas,
  messagingValidationSchemas,
  aiValidationSchemas,
};