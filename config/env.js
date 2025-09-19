// This file is mainly for documenting environment variables and could be used for advanced validation.
// For now, dotenv handles direct loading in server.js.

const requiredEnvVars = [
  'PORT',
  'MONGO_URI',
  'GEMINI_API_KEY',
  'WHATSAPP_SESSION_PATH',
  'EMAIL_SMTP_HOST',
  'EMAIL_SMTP_PORT',
  'EMAIL_SMTP_USER',
  'EMAIL_SMTP_PASS',
  'EMAIL_SENDER_ADDRESS',
];

/**
 * Checks if all required environment variables are set.
 * Throws an error if any are missing, listing all missing variables to facilitate setup.
 */
function checkEnvVariables() {
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

  if (missingVars.length > 0) {
    throw new Error(
      `FATAL: Missing required environment variables: ${missingVars.join(', ')}. ` +
      'Please check your .env file or environment configuration.'
    );
  }

  // TODO: Implement advanced validation (e.g., using Joi or Zod) to check formats
  // for variables like PORT, MONGO_URI, and email settings.
}

module.exports = { checkEnvVariables };