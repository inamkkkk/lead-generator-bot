/**
 * Standardized API response utility.
 * @param {object} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} message - A descriptive message for the response.
 * @param {object} [data={}] - The data payload to send.
 * @param {string} [status='success'] - The status of the operation (success, error, fail).
 */
const sendResponse = (res, statusCode, message, data = {}, status = 'success') => {
  res.status(statusCode).json({
    status,
    statusCode,
    message,
    data,
  });
};

/**
 * Sends a success response.
 * @param {object} res - Express response object.
 * @param {number} statusCode - HTTP status code (e.g., 200, 201).
 * @param {string} message - A descriptive success message.
 * @param {object} [data={}] - The data payload to send.
 */
exports.success = (res, statusCode = 200, message = 'Operation successful', data = {}) => {
  sendResponse(res, statusCode, message, data, 'success');
};

/**
 * Sends an error response.
 * @param {object} res - Express response object.
 * @param {number} statusCode - HTTP status code (e.g., 400, 401, 500).
 * @param {string} message - A descriptive error message.
 * @param {object} [errorDetails={}] - Additional details about the error.
 */
exports.error = (res, statusCode = 500, message = 'An error occurred', errorDetails = {}) => {
  res.status(statusCode).json({
    status: 'error',
    statusCode,
    message,
    error: errorDetails,
  });
};
