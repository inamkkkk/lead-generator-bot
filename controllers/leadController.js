const Lead = require('../models/Lead');
const { success, error } = require('../utils/apiResponse');
const appLogger = require('../utils/logger');

// @desc    Get all leads
// @route   GET /api/leads
// @access  Public (for internal bot use)
exports.getAllLeads = async (req, res) => {
  try {
    const leads = await Lead.find({});
    return success(res, 200, 'Leads retrieved successfully', leads);
  } catch (err) {
    appLogger.error(`Failed to retrieve leads: ${err.message}`, { error: err });
    return error(res, 500, 'Failed to retrieve leads', err.message);
  }
};

// @desc    Get single lead by ID
// @route   GET /api/leads/:id
// @access  Public (for internal bot use)
exports.getLeadById = async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) {
      return error(res, 404, 'Lead not found');
    }
    return success(res, 200, 'Lead retrieved successfully', lead);
  } catch (err) {
    appLogger.error(`Failed to retrieve lead ${req.params.id}: ${err.message}`, { error: err });
    // Handle invalid ObjectId format by treating it as not found
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return error(res, 404, 'Lead not found');
    }
    return error(res, 500, 'Failed to retrieve lead', err.message);
  }
};

// @desc    Create a new lead
// @route   POST /api/leads
// @access  Public (for internal bot use or scraper)
exports.createLead = async (req, res) => {
  try {
    // validatedBody comes from validationMiddleware using Joi
    const newLead = await Lead.create(req.validatedBody);
    return success(res, 201, 'Lead created successfully', newLead);
  } catch (err) {
    appLogger.error(`Failed to create lead: ${err.message}`, { error: err, body: req.validatedBody });
    // Handle duplicate key error specifically for unique email/phone
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return error(res, 409, `Lead with this ${field} already exists.`, { duplicateField: field });
    }
    return error(res, 500, 'Failed to create lead', err.message);
  }
};

// @desc    Update a lead
// @route   PUT /api/leads/:id
// @access  Public (for internal bot use)
exports.updateLead = async (req, res) => {
  try {
    const updatedLead = await Lead.findByIdAndUpdate(req.params.id, req.validatedBody, {
      new: true, // Return the updated document
      runValidators: true, // Run schema validators on update
    });
    if (!updatedLead) {
      return error(res, 404, 'Lead not found');
    }
    return success(res, 200, 'Lead updated successfully', updatedLead);
  } catch (err) {
    appLogger.error(`Failed to update lead ${req.params.id}: ${err.message}`, { error: err, body: req.validatedBody });
    // Handle invalid ObjectId format by treating it as not found
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return error(res, 404, 'Lead not found');
    }
    // Handle duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyValue)[0];
      return error(res, 409, `Another lead with this ${field} already exists.`, { duplicateField: field });
    }
    return error(res, 500, 'Failed to update lead', err.message);
  }
};

// @desc    Delete a lead
// @route   DELETE /api/leads/:id
// @access  Public (for internal bot use)
exports.deleteLead = async (req, res) => {
  try {
    const deletedLead = await Lead.findByIdAndDelete(req.params.id);
    if (!deletedLead) {
      return error(res, 404, 'Lead not found');
    }
    return success(res, 200, 'Lead deleted successfully', { id: deletedLead._id });
  } catch (err) {
    appLogger.error(`Failed to delete lead ${req.params.id}: ${err.message}`, { error: err });
    // Handle invalid ObjectId format by treating it as not found
    if (err.name === 'CastError' && err.kind === 'ObjectId') {
      return error(res, 404, 'Lead not found');
    }
    return error(res, 500, 'Failed to delete lead', err.message);
  }
};