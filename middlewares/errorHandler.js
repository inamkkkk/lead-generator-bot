const appLogger = require('../utils/logger');

const errorHandler = (err, req, res, next) => {
  appLogger.error(`Error: ${err.message}`, { path: req.path, method: req.method, stack: err.stack, details: err.details || {} });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message: err.message || 'An unexpected error occurred.',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }), // Only send stack in dev
    ...err.details && { details: err.details } // For validation errors etc.
  });
};

module.exports = errorHandler;
