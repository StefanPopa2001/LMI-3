/**
 * Common API response utilities
 * Standardizes response formats across the application
 */

/**
 * Send a successful response
 * @param {Object} res - Express response object
 * @param {*} data - Data to send
 * @param {String} message - Optional success message
 * @param {Number} status - HTTP status code (default: 200)
 */
const success = (res, data, message = 'Success', status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

/**
 * Send an error response
 * @param {Object} res - Express response object
 * @param {String} message - Error message
 * @param {Number} status - HTTP status code (default: 500)
 * @param {*} details - Optional error details
 */
const error = (res, message = 'An error occurred', status = 500, details = null) => {
  const response = {
    success: false,
    error: message
  };
  
  if (details) {
    response.details = details;
  }
  
  return res.status(status).json(response);
};

/**
 * Send a validation error response
 * @param {Object} res - Express response object
 * @param {String|Array} errors - Validation error message(s)
 */
const validationError = (res, errors) => {
  return res.status(400).json({
    success: false,
    error: 'Validation failed',
    errors: Array.isArray(errors) ? errors : [errors]
  });
};

/**
 * Send a not found response
 * @param {Object} res - Express response object
 * @param {String} resource - Name of the resource not found
 */
const notFound = (res, resource = 'Resource') => {
  return res.status(404).json({
    success: false,
    error: `${resource} not found`
  });
};

/**
 * Send an unauthorized response
 * @param {Object} res - Express response object
 * @param {String} message - Optional custom message
 */
const unauthorized = (res, message = 'Unauthorized') => {
  return res.status(401).json({
    success: false,
    error: message
  });
};

/**
 * Send a forbidden response
 * @param {Object} res - Express response object
 * @param {String} message - Optional custom message
 */
const forbidden = (res, message = 'Forbidden') => {
  return res.status(403).json({
    success: false,
    error: message
  });
};

module.exports = {
  success,
  error,
  validationError,
  notFound,
  unauthorized,
  forbidden
};
