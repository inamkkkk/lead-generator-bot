const mongoose = require('mongoose');
const appLogger = require('../utils/logger');

const connectDB = async () => {
  try {
    // In Mongoose 6+, options like useNewUrlParser and useUnifiedTopology are
    // deprecated and no longer needed as they are the default behavior.
    const conn = await mongoose.connect(process.env.MONGO_URI);

    appLogger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    appLogger.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = { connectDB };