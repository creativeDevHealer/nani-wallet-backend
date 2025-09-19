const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
});

/**
 * Rate limiting middleware
 */
const rateLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100, // limit each IP to 100 requests per windowMs
  message: {
    success: false,
    error: 'Too many requests from this IP, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiting for auth endpoints
 */
const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // limit each IP to 10 auth requests per windowMs
  message: {
    success: false,
    error: 'Too many authentication attempts, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Stricter rate limiting for OTP endpoints
 */
const otpRateLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 5, // limit each IP to 5 OTP requests per windowMs
  message: {
    success: false,
    error: 'Too many OTP requests, please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = {
  securityHeaders,
  rateLimiter,
  authRateLimiter,
  otpRateLimiter
};
