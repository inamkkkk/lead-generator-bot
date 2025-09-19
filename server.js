require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const { connectDB } = require('./config/db');
const errorHandler = require('./middlewares/errorHandler');
const requestLogger = require('./middlewares/requestLogger');
const appLogger = require('./utils/logger');

// Import Routes
const leadRoutes = require('./routes/leadRoutes');
const scraperRoutes = require('./routes/scraperRoutes');
const messagingRoutes = require('./routes/messagingRoutes');
const aiRoutes = require('./routes/aiRoutes');
const schedulerRoutes = require('./routes/schedulerRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

// Connect to Database
connectDB();

// Middleware
app.use(cors());
app.use(express.json()); // Replaces deprecated body-parser
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Routes
app.get('/', (req, res) => {
  res.status(200).json({ message: 'Lead Generator Bot API is running!' });
});
app.use('/api/leads', leadRoutes);
app.use('/api/scraper', scraperRoutes);
app.use('/api/messaging', messagingRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/scheduler', schedulerRoutes);

// Health Check
app.get('/health', (req, res) => {
  const isDbConnected = mongoose.connection.readyState === 1; // 1 = connected
  if (isDbConnected) {
    res.status(200).json({ status: 'UP', database: 'connected' });
  } else {
    res.status(503).json({ status: 'DOWN', database: 'disconnected', state: mongoose.connection.readyState });
  }
});

// Error Handling Middleware
app.use(errorHandler);

// Start the server
const server = app.listen(PORT, () => {
  appLogger.info(`Server is running on port ${PORT}`);
  appLogger.info(`Access API at http://localhost:${PORT}`);
});

// Graceful Shutdown Logic
const gracefulShutdown = (signal, exitCode) => {
  appLogger.info(`${signal} received. Shutting down gracefully.`);
  server.close(() => {
    appLogger.info('HTTP server closed.');
    mongoose.connection.close(false, () => {
      appLogger.info('MongoDB connection closed.');
      process.exit(exitCode);
    });
  });
};

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  appLogger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
  // An unhandled rejection can leave the application in an unknown state.
  // It's safer to shut down.
  gracefulShutdown('UNHANDLED_REJECTION', 1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  appLogger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  // An uncaught exception means the application is in an unstable state.
  // A graceful shutdown is necessary.
  gracefulShutdown('UNCAUGHT_EXCEPTION', 1);
});

// Listen for termination signals from the OS
process.on('SIGTERM', () => gracefulShutdown('SIGTERM', 0));
process.on('SIGINT', () => gracefulShutdown('SIGINT', 0));