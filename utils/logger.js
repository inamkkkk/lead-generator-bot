const winston = require('winston');

const appLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  // Default format for transports that don't have their own (i.e., file transports).
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.json() // Use JSON format for structured logging in files.
  ),
  transports: [
    new winston.transports.Console({
      // For the console, we want a more human-readable format.
      // This format overrides the logger's default format, so we must redefine the timestamp.
      format: winston.format.combine(
        winston.format.colorize({ all: true }),
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(
          (info) => `[${info.timestamp}] ${info.level}: ${info.message}`
        )
      ),
    }),
    // File transports will use the logger's default JSON format.
    new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
    new winston.transports.File({ filename: 'logs/combined.log' }),
  ],
  // Do not exit on handled exceptions.
  exitOnError: false,
});

module.exports = appLogger;