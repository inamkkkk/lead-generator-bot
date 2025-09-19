const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const { validate, aiValidationSchemas } = require('../middlewares/validationMiddleware');

// Route to generate a personalized message for a lead
router.post(
    '/generate-message',
    validate(aiValidationSchemas.generateMessage),
    aiController.generatePersonalizedMessage
);

// Route to summarize a conversation with a lead
router.post(
    '/summarize-conversation',
    validate(aiValidationSchemas.summarizeConversation),
    aiController.summarizeConversation
);

// Route to extract key points from a conversation or text
// TODO: The validation schema may need to be more dynamic to handle various content structures.
router.post(
    '/extract-key-points',
    validate(aiValidationSchemas.extractKeyPoints),
    aiController.extractKeyPoints
);

module.exports = router;