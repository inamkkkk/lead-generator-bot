const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { validate, leadValidationSchemas } = require('../middlewares/validationMiddleware');

// Routes for the collection of leads
router.route('/')
  // Get all leads
  .get(leadController.getAllLeads)
  // Create a new lead
  .post(validate(leadValidationSchemas.createLead), leadController.createLead);

// Routes for a single lead identified by its ID
router.route('/:id')
  // Get a single lead by ID
  .get(leadController.getLeadById)
  // Update a lead by ID
  .put(validate(leadValidationSchemas.updateLead), leadController.updateLead)
  // Delete a lead by ID
  .delete(leadController.deleteLead);

module.exports = router;