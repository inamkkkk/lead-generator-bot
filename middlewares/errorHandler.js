const appLogger = require('../utils/logger');

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  // Log the full error details for debugging
  appLogger.error(`Error: ${err.message}`, { path: req.path, method: req.method, stack: err.stack, details: err.details || {} });

  const statusCode = err.statusCode || 500;

  // In production, do not expose detailed error messages for 5xx errors
  const message = (process.env.NODE_ENV === 'production' && statusCode >= 500)
    ? 'An internal server error occurred.'
    : err.message || 'An unexpected error occurred.';

  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    ...(err.details && { details: err.details }), // For validation errors etc.
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Only send stack in dev
  });
};

module.exports = errorHandler;