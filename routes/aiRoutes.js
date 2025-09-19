const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { validate, aiValidationSchemas } = require('../middlewares/validationMiddleware');

// Route to generate a personalized message for a lead
router.post('/generate-message', validate(aiValidationSchemas.generateMessage), aiController.generatePersonalizedMessage);

// Route to summarize a conversation with a lead
router.post('/summarize-conversation', validate(aiValidationSchemas.summarizeConversation), aiController.summarizeConversation);

// Route to extract key points from a conversation or text
router.post('/extract-key-points', aiController.extractKeyPoints); // Requires a schema similar to summarize or dynamic content

module.exports = router;
