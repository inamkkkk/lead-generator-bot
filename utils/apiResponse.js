/**
 * @module apiResponse
 * @description Standardized API response utilities for Express.js applications.
 */

/**
 * A private helper function to construct and send a standardized API response.
 * This is an internal function and should not be exported or used directly outside this module.
 *
 * @param {object} res - Express response object.
 * @param {number} statusCode - HTTP status code.
 * @param {string} status - The status of the operation (e.g., 'success', 'error').
 * @param {string} message - A descriptive message for the response.
 * @param {object} [payload] - The data payload for success or error details for failure.
 */
const sendResponse = (res, statusCode, status, message, payload) => {
  const response = {
    status,
    statusCode,
    message,
  };

  // Conditionally add 'data' for success or 'error' for other statuses if a payload is provided
  if (payload !== undefined) {
    if (status === 'success') {
      response.data = payload;
    } else {
      response.error = payload;
    }
  }

  res.status(statusCode).json(response);
};

/**
 * Sends a success response.
 *
 * @param {object} res - Express response object.
 * @param {number} [statusCode=200] - HTTP status code (e.g., 200, 201).
 * @param {string} [message='Operation successful'] - A descriptive success message.
 * @param {object} [data] - The optional data payload to send.
 */
const success = (res, statusCode = 200, message = 'Operation successful', data) => {
  sendResponse(res, statusCode, 'success', message, data);
};

/**
 * Sends an error response. Use for client-side or server-side errors (4xx or 5xx).
 *
 * @param {object} res - Express response object.
 * @param {number} [statusCode=500] - HTTP status code (e.g., 400, 500).
 * @param {string} [message='An error occurred'] - A descriptive error message.
 * @param {object} [errorDetails] - Optional additional details about the error.
 */
const error = (res, statusCode = 500, message = 'An error occurred', errorDetails) => {
  sendResponse(res, statusCode, 'error', message, errorDetails);
};

module.exports = {
  success,
  error,
};