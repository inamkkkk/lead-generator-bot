require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bodyParser = require('body-parser');
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
app.use(bodyParser.json());
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
  if (mongoose.connection.readyState === 1) {
    res.status(200).json({ status: 'UP', database: 'connected' });
  } else {
    res.status(503).json({ status: 'DOWN', database: 'disconnected' });
  }
});

// Error Handling Middleware
app.use(errorHandler);

// Start the server
app.listen(PORT, () => {
  appLogger.info(`Server is running on port ${PORT}`);
  appLogger.info(`Access API at http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  appLogger.error(`Unhandled Rejection: ${err.message}`, { stack: err.stack });
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  appLogger.error(`Uncaught Exception: ${err.message}`, { stack: err.stack });
  process.exit(1); // Exit with a failure code
});
