const express = require('express');
const router = express.Router();
const leadController = require('../controllers/leadController');
const { validate, leadValidationSchemas } = require('../middlewares/validationMiddleware');

// Get all leads
router.get('/', leadController.getAllLeads);

// Get a single lead by ID
router.get('/:id', leadController.getLeadById);

// Create a new lead
router.post('/', validate(leadValidationSchemas.createLead), leadController.createLead);

// Update a lead by ID
router.put('/:id', validate(leadValidationSchemas.updateLead), leadController.updateLead);

// Delete a lead by ID
router.delete('/:id', leadController.deleteLead);

module.exports = router;
