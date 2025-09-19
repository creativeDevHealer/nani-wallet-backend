const morgan = require('morgan');

/**
 * Custom logging format
 */
const logFormat = process.env.NODE_ENV === 'production' 
  ? 'combined' 
  : ':method :url :status :res[content-length] - :response-time ms';

/**
 * Custom token for request ID (if you add request ID middleware)
 */
morgan.token('id', (req) => req.id);

/**
 * Skip logging for health check endpoints in production
 */
const skip = (req, res) => {
  if (process.env.NODE_ENV === 'production') {
    return req.url === '/api/health' || req.url === '/api/test-db';
  }
  return false;
};

/**
 * Request logging middleware
 */
const requestLogger = morgan(logFormat, {
  skip,
  stream: {
    write: (message) => {
      // Remove trailing newline and log
      console.log('📝', message.trim());
    }
  }
});

/**
 * Request ID middleware (optional but useful for tracking)
 */
const requestId = (req, res, next) => {
  req.id = Math.random().toString(36).substr(2, 9);
  res.setHeader('X-Request-ID', req.id);
  next();
};

module.exports = {
  requestLogger,
  requestId
};
