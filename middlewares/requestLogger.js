const appLogger = require('../utils/logger');

const requestLogger = (req, res, next) => {
  appLogger.info(`Incoming Request: ${req.method} ${req.originalUrl}`, {
    ip: req.ip,
    body: req.body,
    query: req.query,
    params: req.params,
  });
  next();
};

module.exports = requestLogger;
