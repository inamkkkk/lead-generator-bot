const nodemailer = require('nodemailer');
const appLogger = require('./logger');

let transporter;

const initializeEmailClient = () => {
  if (transporter) {
    appLogger.info('Email client already initialized.');
    return transporter;
  }

  transporter = nodemailer.createTransport({
    host: process.env.EMAIL_SMTP_HOST,
    port: process.env.EMAIL_SMTP_PORT,
    secure: process.env.EMAIL_SMTP_PORT == 465, // Use `true` for port 465, `false` for other ports like 587
    auth: {
      user: process.env.EMAIL_SMTP_USER,
      pass: process.env.EMAIL_SMTP_PASS,
    },
  });

  transporter.verify(function (error, success) {
    if (error) {
      appLogger.error('Email client verification failed:', { error: error.message });
    } else {
      appLogger.info('Email client is ready to send messages.');
    }
  });

  return transporter;
};

const sendEmail = async (to, subject, htmlContent, textContent) => {
  if (!transporter) {
    initializeEmailClient();
    if (!transporter) {
      throw new Error('Email client could not be initialized.');
    }
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
    appLogger.error(`Failed to send email to ${to}: ${error.message}`, { error: error });
    throw error;
  }
};

module.exports = {
  initializeEmailClient,
  sendEmail,
};
