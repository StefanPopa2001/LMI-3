const validator = require('validator');
const rateLimit = require('express-rate-limit');

const DEBUG_NO_VALIDATION = process.env.DEBUG_NO_VALIDATION === 'true';
const DEFAULT_PASSWORD = process.env.DEFAULT_PASSWORD || 'dhkak81';

// Input sanitization functions
function sanitizeInput(input) {
  if (DEBUG_NO_VALIDATION) return input; // passthrough in debug
  if (typeof input !== 'string') return input;
  return validator.escape(input.trim());
}

function sanitizeEmail(email) {
  if (DEBUG_NO_VALIDATION) return email; // passthrough in debug
  if (typeof email !== 'string') return '';
  return validator.normalizeEmail(email.trim()) || '';
}

function sanitizePhone(phone) {
  if (DEBUG_NO_VALIDATION) return phone; // passthrough in debug
  if (typeof phone !== 'string') return '';
  // Remove all non-numeric characters except + and leading zeros
  return phone.trim().replace(/[^\d+]/g, '');
}

// Enhanced password validation
function validatePassword(password) {
  if (DEBUG_NO_VALIDATION) return null;
  if (!password || password.length < 8) {
    return "Password must be at least 8 characters long";
  }
  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    return "Password must contain at least one uppercase letter, one lowercase letter, and one number";
  }
  if (/(.)\1{2,}/.test(password)) {
    return "Password cannot contain repeated characters";
  }
  // Check for common weak patterns
  const weakPatterns = ['123456', 'password', 'qwerty', 'admin'];
  const lowerPassword = password.toLowerCase();
  for (const pattern of weakPatterns) {
    if (lowerPassword.includes(pattern)) {
      return "Password cannot contain common weak patterns";
    }
  }
  return null;
}

// Rate limiting configuration (anti brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // Increased limit for production behind proxy
  message: 'Too many requests from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  skipFailedRequests: false,
  // Trust proxy headers from Traefik
  validate: { xForwardedForHeader: false }
});

module.exports = {
  sanitizeInput,
  sanitizeEmail,
  sanitizePhone,
  validatePassword,
  authLimiter,
  DEBUG_NO_VALIDATION,
  DEFAULT_PASSWORD
};