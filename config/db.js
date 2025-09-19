const mongoose = require('mongoose');
const appLogger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // Mongoose 6+ deprecates these options, but keeping them for clarity if using older versions
      // useCreateIndex: true,
      // useFindAndModify: false,
    });
    appLogger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    appLogger.error(`Error: ${error.message}`);
    process.exit(1); // Exit process with failure
  }
};

module.exports = { connectDB };
