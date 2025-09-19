const { getGeminiModel } = require('../utils/geminiClient');
const { success, error } = require('../utils/apiResponse');
const appLogger = require('../utils/logger');
const Lead = require('../models/Lead');
const Response = require('../models/Response');
const Summary = require('../models/Summary');
const Log = require('../models/Log');

// @desc    Generate a personalized message for a lead using AI
// @route   POST /api/ai/generate-message
// @access  Public (for internal bot use)
exports.generatePersonalizedMessage = async (req, res) => {
  const { leadId, context, purpose } = req.validatedBody;
  const geminiModel = getGeminiModel();

  if (!geminiModel) {
    return error(res, 503, 'AI service (Gemini) is not initialized or available.');
  }

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return error(res, 404, 'Lead not found.');
    }

    // TODO: Implement detailed prompt engineering for personalized message generation
    // Steps:
    // 1. Craft a detailed prompt for Gemini, including lead's name, company (if available), past interactions (from 'Response'/'Summary'), 'context', and 'purpose'.
    // 2. Incorporate anti-spam techniques like variable templates/phrasing in the prompt.
    // 3. Ensure the output is natural, business-friendly, and avoids detection.

    const previousInteractions = await Response.find({ leadId }).sort({ timestamp: -1 }).limit(3);
    const historyString = previousInteractions.map(r => `${r.direction}: ${r.messageContent}`).join('\n');

    const prompt = `Generate a highly personalized, natural, and business-friendly outreach message for a lead named ${lead.name || 'valued client'}. 
Context: ${context}
Purpose: ${purpose}
Previous interactions (if any):
${historyString}

Focus on avoiding generic spam phrases and making it sound like a genuine human conversation. Suggest a next step.`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = (await result.response).text();

    success(res, 200, 'Personalized message generated successfully', { message: responseText });
    Log.create({ level: 'info', module: 'AI', message: `Personalized message generated for lead ${leadId}.` });

  } catch (err) {
    appLogger.error(`Failed to generate personalized message for lead ${leadId}: ${err.message}`, { error: err });
    error(res, 500, 'Failed to generate personalized message', err.message);
  }
};

// @desc    Summarize a conversation with a lead using AI
// @route   POST /api/ai/summarize-conversation
// @access  Public (for internal bot use)
exports.summarizeConversation = async (req, res) => {
  const { leadId, conversationHistory } = req.validatedBody;
  const geminiModel = getGeminiModel();

  if (!geminiModel) {
    return error(res, 503, 'AI service (Gemini) is not initialized or available.');
  }

  try {
    const lead = await Lead.findById(leadId);
    if (!lead) {
      return error(res, 404, 'Lead not found.');
    }

    // TODO: Implement conversation summarization logic
    // Steps:
    // 1. Format 'conversationHistory' (array of objects with sender/message) into a coherent string for the AI.
    // 2. Craft a prompt asking Gemini to summarize the discussion and extract key points.
    // 3. Store the 'conversation_summary' and 'key_points' in the 'Summary' collection for the lead.

    const formattedConversation = conversationHistory.map(entry => `${entry.sender}: ${entry.message}`).join('\n');

    const prompt = `Summarize the following conversation with Lead ${lead.name || 'ID ' + leadId} and extract 3-5 key points discussed. The summary should be concise and capture the essence of the discussion.
Conversation:
${formattedConversation}`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = (await result.response).text();

    // Simple extraction of key points (can be improved with more sophisticated AI parsing or regex)
    const keyPointsMatch = responseText.match(/Key Points:([\s\S]*)/i);
    const conversationSummary = keyPointsMatch ? responseText.substring(0, keyPointsMatch.index).trim() : responseText.trim();
    const keyPoints = keyPointsMatch ? keyPointsMatch[1].split(/\n|- /).map(p => p.trim()).filter(p => p.length > 0) : [];

    await Summary.findOneAndUpdate(
      { leadId: lead._id },
      { conversationSummary, keyPoints, lastUpdatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    success(res, 200, 'Conversation summarized and key points extracted successfully', {
      conversationSummary,
      keyPoints,
    });
    Log.create({ level: 'info', module: 'AI', message: `Conversation summarized for lead ${leadId}.` });

  } catch (err) {
    appLogger.error(`Failed to summarize conversation for lead ${leadId}: ${err.message}`, { error: err });
    error(res, 500, 'Failed to summarize conversation', err.message);
  }
};

// @desc    Extract key points from any given text or conversation snippet
// @route   POST /api/ai/extract-key-points
// @access  Public (for internal bot use)
exports.extractKeyPoints = async (req, res) => {
  const { text } = req.body; // 'text' can be a raw string or structured content
  const geminiModel = getGeminiModel();

  if (!geminiModel) {
    return error(res, 503, 'AI service (Gemini) is not initialized or available.');
  }

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    return error(res, 400, 'Text content is required for key point extraction.');
  }

  // TODO: Implement key point extraction logic
  // Steps:
  // 1. Craft a prompt asking Gemini to identify and list key points from the provided 'text'.
  // 2. Parse the response to extract key points effectively.
  try {
    const prompt = `Extract the 3-5 most important key points from the following text:\n\n${text}\n\nList them clearly.`;

    const result = await geminiModel.generateContent(prompt);
    const responseText = (await result.response).text();

    // Basic parsing assuming AI returns a list or bullet points
    const keyPoints = responseText.split(/\n|- /).map(p => p.trim()).filter(p => p.length > 0 && !p.toLowerCase().includes('key points'));

    success(res, 200, 'Key points extracted successfully', { keyPoints });
    Log.create({ level: 'info', module: 'AI', message: `Key points extracted from text.` });

  } catch (err) {
    appLogger.error(`Failed to extract key points: ${err.message}`, { error: err });
    error(res, 500, 'Failed to extract key points', err.message);
  }
};
