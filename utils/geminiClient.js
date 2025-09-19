const { GoogleGenerativeAI } = require('@google/generative-ai');
const appLogger = require('./logger');

let genAI;
let geminiModel;

const initializeGeminiClient = () => {
  if (genAI) {
    appLogger.info('Gemini client already initialized.');
    return genAI;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    appLogger.error('GEMINI_API_KEY is not set in environment variables. AI functionalities will be disabled.');
    return null;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    geminiModel = genAI.getGenerativeModel({ model: 'gemini-pro' }); // Using gemini-pro for text-only tasks
    appLogger.info('Gemini client initialized successfully.');
  } catch (error) {
    appLogger.error(`Failed to initialize Gemini client: ${error.message}`, { error });
    genAI = null;
  }
  return genAI;
};

const getGeminiModel = () => {
  if (!geminiModel) {
    initializeGeminiClient(); // Attempt to initialize if not already
  }
  return geminiModel;
};

module.exports = {
  initializeGeminiClient,
  getGeminiModel,
};
