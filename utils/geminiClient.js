const { GoogleGenerativeAI } = require('@google/generative-ai');
const appLogger = require('./logger');

let genAI;
let geminiModel;

/**
 * Initializes the Google Generative AI client and model.
 * This function is idempotent; it will only initialize the client once.
 */
const initializeGeminiClient = () => {
  // Idempotency check: If the model is already successfully initialized, do nothing.
  if (geminiModel) {
    appLogger.info('Gemini client already initialized.');
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    appLogger.error('GEMINI_API_KEY is not set in environment variables. AI functionalities will be disabled.');
    return;
  }

  try {
    genAI = new GoogleGenerativeAI(apiKey);
    
    // Allow model to be configured via environment variable, with a sensible modern default.
    const modelName = process.env.GEMINI_MODEL_NAME || 'gemini-1.5-flash-latest';
    geminiModel = genAI.getGenerativeModel({ model: modelName });
    
    appLogger.info(`Gemini client initialized successfully with model: ${modelName}`);
  } catch (error) {
    appLogger.error(`Failed to initialize Gemini client: ${error.message}`, { error });
    // Ensure state is clean on failure to allow for subsequent initialization attempts.
    genAI = null;
    geminiModel = null;
  }
};

/**
 * Returns the initialized Gemini model instance.
 * It will attempt to initialize the client if it hasn't been already.
 * @returns {import('@google/generative-ai').GenerativeModel | null} The model instance or null if initialization failed.
 */
const getGeminiModel = () => {
  if (!geminiModel) {
    initializeGeminiClient(); // Attempt to initialize if not already.
  }
  return geminiModel;
};

module.exports = {
  initializeGeminiClient,
  getGeminiModel,
};