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

function checkEnvVariables() {
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      console.warn(`WARNING: Environment variable \`${varName}\` is not set. This might lead to unexpected behavior.`);
    }
  }
}

module.exports = { checkEnvVariables };
