const nodemailer = require('nodemailer');
const appLogger = require('./logger');

let transporter;

const initializeEmailClient = async () => {
  if (transporter) {
    appLogger.info('Email client already initialized.');
    return;
  }

  const smtpPort = parseInt(process.env.EMAIL_SMTP_PORT, 10);
  if (isNaN(smtpPort)) {
    throw new Error('Invalid EMAIL_SMTP_PORT environment variable.');
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: smtpPort,
    secure: smtpPort === 465, // Use true for port 465, false for all other ports
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
  });

  // The original implementation had a race condition where the client could be used before
  // it was verified. Using async/await fixes this by ensuring verification completes
  // before the function returns.
  try {
    await transporter.verify();
    appLogger.info('Email client is ready to send messages.');
  } catch (error) {
    appLogger.error('Email client verification failed:', { error: error.message });
    // Reset transporter on failure to allow for re-initialization attempts
    transporter = null;
    throw error; // Re-throw to signal that initialization failed
  }
};

const sendEmail = async (to, subject, htmlContent, textContent) => {
  // Ensure the client is initialized before attempting to send an email.
  if (!transporter) {
    // The original logic was flawed as it called a synchronous function with an
    // async callback, leading to race conditions. Awaiting initialization ensures
    // the transporter is ready and verified before proceeding.
    await initializeEmailClient();
  }

  const mailOptions = {
    from: process.env.EMAIL_SENDER_ADDRESS,
    to: to,
    subject: subject,
    html: htmlContent,
    text: textContent || htmlContent.replace(/<[^>]*>?/gm, ''), // Generate text from HTML if not provided
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    appLogger.info(`Email sent to ${to}: ${info.messageId}`);
    return info;
  } catch (error) {
    // Log the error and re-throw it so the caller can handle the failure.
    appLogger.error(`Failed to send email to ${to}.`, { error: error.stack });
    throw error;
  }
};

module.exports = {
  initializeEmailClient,
  sendEmail,
};