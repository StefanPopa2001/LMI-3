/**
 * Input validation and sanitization utilities
 */
const validator = require('validator');

const DEBUG_NO_VALIDATION = process.env.DEBUG_NO_VALIDATION === 'true';

/**
 * Sanitize general text input
 * @param {String} input - Input to sanitize
 * @returns {String} Sanitized input
 */
function sanitizeInput(input) {
  if (DEBUG_NO_VALIDATION) return input;
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
}

/**
 * Sanitize and normalize email
 * @param {String} email - Email to sanitize
 * @returns {String} Normalized email
 */
function sanitizeEmail(email) {
  if (DEBUG_NO_VALIDATION) return email;
  if (typeof email !== 'string') return '';
  return validator.normalizeEmail(email.trim()) || '';
}

/**
 * Sanitize phone number
 * @param {String} phone - Phone number to sanitize
 * @returns {String} Sanitized phone number
 */
function sanitizePhone(phone) {
  if (DEBUG_NO_VALIDATION) return phone;
  if (typeof phone !== 'string') return '';
  return phone.trim().replace(/[^\d+]/g, '');
}

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} True if valid
 */
function isValidEmail(email) {
  if (DEBUG_NO_VALIDATION) return true;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Validate name format (letters and spaces only)
 * @param {String} name - Name to validate
 * @returns {Boolean} True if valid
 */
function isValidName(name) {
  if (DEBUG_NO_VALIDATION) return true;
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  return nameRegex.test(name);
}

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} { valid: Boolean, error: String|null }
 */
function validatePassword(password) {
  if (DEBUG_NO_VALIDATION) return { valid: true, error: null };
  
  if (!password || password.length < 8) {
    return { valid: false, error: 'Password must be at least 8 characters long' };
  }
  
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return { 
      valid: false, 
      error: 'Password must contain at least one uppercase letter, one lowercase letter, and one number' 
    };
  }
  
  if (/(.)\1{2,}/.test(password)) {
    return { valid: false, error: 'Password cannot contain repeated characters' };
  }
  
  const weakPatterns = ['123456', 'password', 'qwerty', 'admin'];
  const lowerPassword = password.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerPassword.includes(pattern)) {
      return { valid: false, error: 'Password cannot contain common weak patterns' };
    }
  }
  
  return { valid: true, error: null };
}

/**
 * Validate required fields
 * @param {Object} data - Data object to validate
 * @param {Array} requiredFields - Array of required field names
 * @returns {Object} { valid: Boolean, missing: Array }
 */
function validateRequiredFields(data, requiredFields) {
  if (DEBUG_NO_VALIDATION) return { valid: true, missing: [] };
  
  const missing = requiredFields.filter(field => {
    const value = data[field];
    return value === undefined || value === null || value === '';
  });
  
  return {
    valid: missing.length === 0,
    missing
  };
}

/**
 * Validate date format and parse
 * @param {String} dateStr - Date string to validate
 * @param {String} fieldName - Name of the field for error messages
 * @returns {Object} { valid: Boolean, date: Date|null, error: String|null }
 */
function validateAndParseDate(dateStr, fieldName = 'Date') {
  if (!dateStr) {
    return { valid: false, date: null, error: `${fieldName} is required` };
  }
  
  let date;
  if (dateStr.includes && dateStr.includes('T')) {
    date = new Date(dateStr);
  } else {
    date = new Date(dateStr + 'T00:00:00');
  }
  
  if (isNaN(date.getTime())) {
    return { valid: false, date: null, error: `Invalid ${fieldName.toLowerCase()} format` };
  }
  
  return { valid: true, date, error: null };
}

/**
 * Sanitize an object's string fields
 * @param {Object} obj - Object to sanitize
 * @param {Array} fields - Array of field names to sanitize
 * @param {String} type - Type of sanitization ('text', 'email', 'phone')
 * @returns {Object} Sanitized object
 */
function sanitizeObject(obj, fields, type = 'text') {
  const sanitized = { ...obj };
  const sanitizer = type === 'email' ? sanitizeEmail : type === 'phone' ? sanitizePhone : sanitizeInput;
  
  fields.forEach(field => {
    if (sanitized[field]) {
      sanitized[field] = sanitizer(sanitized[field]);
    }
  });
  
  return sanitized;
}

module.exports = {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  isValidEmail,
  isValidName,
  validatePassword,
  validateRequiredFields,
  validateAndParseDate,
  sanitizeObject,
  DEBUG_NO_VALIDATION
};
