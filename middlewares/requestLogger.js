const appLogger = require('../utils/logger');

// Define a set of sensitive keys to redact from logs for security purposes.
const SENSITIVE_KEYS = new Set([
  'password',
  'token',
  'authorization',
  'apiKey',
  'secret',
  'creditCard',
  'cvv',
]);

/**
 * Creates a deep copy of an object, redacting values for sensitive keys.
 * This prevents sensitive data like passwords from being written to logs.
 * @param {object} obj The object to clone and redact.
 * @returns {object} A new object with sensitive values replaced by '[REDACTED]'.
 */
const getRedactedCopy = (obj) => {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }
  // Using JSON.stringify with a replacer function is a concise way to deep clone and redact.
  return JSON.parse(JSON.stringify(obj, (key, value) => {
    if (SENSITIVE_KEYS.has(String(key).toLowerCase())) {
      return '[REDACTED]';
    }
    return value;
  }));
};

const requestLogger = (req, res, next) => {
  // Redact sensitive information from the body before logging.
  const redactedBody = req.body ? getRedactedCopy(req.body) : {};

  appLogger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    body: redactedBody,
    query: req.query,
    params: req.params,
  });

  next();
};

module.exports = requestLogger;