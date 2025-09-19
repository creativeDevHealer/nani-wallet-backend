/**
 * Global error handling middleware
 */
const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString()
  });

  // Default error response
  let error = {
    success: false,
    error: 'Internal server error'
  };

  // Handle different types of errors
  if (err.name === 'ValidationError') {
    // Mongoose validation error
    error.error = 'Validation failed';
    error.details = Object.values(err.errors).map(e => e.message);
    return res.status(400).json(error);
  }

  if (err.name === 'CastError') {
    // Mongoose cast error (invalid ObjectId)
    error.error = 'Invalid resource ID';
    return res.status(400).json(error);
  }

  if (err.code === 11000) {
    // Mongoose duplicate key error
    error.error = 'Resource already exists';
    return res.status(409).json(error);
  }

  if (err.name === 'JsonWebTokenError') {
    error.error = 'Invalid token';
    return res.status(401).json(error);
  }

  if (err.name === 'TokenExpiredError') {
    error.error = 'Token expired';
    return res.status(401).json(error);
  }

  if (err.name === 'MulterError') {
    if (err.code === 'LIMIT_FILE_SIZE') {
      error.error = 'File too large';
      return res.status(413).json(error);
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      error.error = 'Too many files';
      return res.status(413).json(error);
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      error.error = 'Unexpected file field';
      return res.status(400).json(error);
    }
  }

  // Handle custom application errors
  if (err.statusCode) {
    error.error = err.message || 'Application error';
    return res.status(err.statusCode).json(error);
  }

  // Default server error
  res.status(500).json(error);
};

/**
 * 404 handler for undefined routes
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
