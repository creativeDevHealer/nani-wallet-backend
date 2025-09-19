# Nani Wallet Backend

A secure and scalable backend API for the Nani Wallet application, built with Node.js, Express, and MongoDB.

## 🚀 Features

- **Authentication & Authorization**: JWT-based auth with secure token management
- **KYC Management**: Complete identity verification workflow
- **OTP Services**: Email and SMS OTP verification
- **Transaction Management**: Secure transaction processing
- **Payment Methods**: Multi-payment method support
- **Security**: Rate limiting, input validation, error handling
- **Middleware**: Comprehensive logging, security headers, CORS

## 🛠️ Technology Stack

- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JSON Web Tokens (JWT)
- **File Upload**: Multer
- **Email**: Nodemailer
- **SMS**: Telnyx
- **Security**: Helmet, express-rate-limit
- **Logging**: Morgan

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd naniwallet-backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://127.0.0.1:27017/naniwallet
   JWT_SECRET=your-super-secret-jwt-key
   PORT=3000
   NODE_ENV=development
   ```

4. **Start the server**
   ```bash
   # Development
   npm run dev
   
   # Production
   npm start
   ```

## 🧪 Testing

Run the test suite:
```bash
npm test
```

The test suite includes:
- Health check endpoints
- Database connectivity
- API endpoint validation
- Authentication tests
- Error handling tests

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication Endpoints
```
POST /auth/register     - Register new user
POST /auth/login        - User login
POST /auth/verify-token - Verify JWT token
GET  /auth/profile      - Get user profile (protected)
PUT  /auth/profile      - Update user profile (protected)
```

### OTP Endpoints
```
POST /otp/send          - Send email OTP
POST /otp/verify        - Verify email OTP
POST /otp/send-phone    - Send SMS OTP
POST /otp/verify-phone  - Verify SMS OTP
```

### KYC Endpoints
```
GET  /kyc/status        - Get KYC status (protected)
POST /kyc/submit        - Submit KYC documents (protected)
GET  /kyc/pending       - Get pending KYCs (admin)
POST /kyc/update-status - Update KYC status (admin)
```

### Utility Endpoints
```
GET /health             - Health check
GET /test-db            - Database connection test
```

## 🔒 Security Features

- **Rate Limiting**: Prevents abuse with configurable limits
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Secure error responses without sensitive data
- **CORS Protection**: Configurable cross-origin resource sharing
- **Security Headers**: Helmet.js for security headers
- **Password Hashing**: bcrypt for secure password storage

## 📁 Project Structure

```
naniwallet-backend/
├── config/
│   ├── mongodb.js          # Database configuration
│   └── firebase.js         # Firebase configuration
├── controllers/
│   ├── auth.js             # Authentication logic
│   ├── kyc.js              # KYC management
│   ├── otp.js              # OTP services
│   ├── transactionController.js
│   └── paymentMethodController.js
├── middlewares/
│   ├── errorHandler.js     # Error handling middleware
│   ├── logger.js           # Request logging
│   └── security.js         # Security middleware
├── models/
│   ├── User.js             # User model
│   ├── KYC.js              # KYC model
│   ├── Otp.js              # OTP model
│   ├── Transaction.js      # Transaction model
│   └── PaymentMethod.js    # Payment method model
├── routes/
│   ├── auth.js             # Auth routes
│   ├── kyc.js              # KYC routes
│   ├── otp.js              # OTP routes
│   ├── transaction.js      # Transaction routes
│   └── paymentMethod.js    # Payment method routes
├── utils/
│   └── nodemailer.js       # Email utility
├── server.js               # Main server file
├── test-endpoints.js       # API testing script
└── env.example             # Environment variables template
```

## 🚀 Deployment

### Development
```bash
npm run dev
```

### Production
```bash
npm start
```

### Environment Variables
Ensure all required environment variables are set:
- `MONGODB_URI`: Database connection string
- `JWT_SECRET`: JWT signing secret
- `PORT`: Server port (default: 3000)
- `NODE_ENV`: Environment (development/production)

## 🔧 Configuration

### Database
The application uses MongoDB with Mongoose ODM. Connection is automatically established on server start.

### Rate Limiting
- General API: 100 requests per 15 minutes
- Auth endpoints: 10 requests per 15 minutes  
- OTP endpoints: 5 requests per 5 minutes

### File Uploads
- Maximum file size: 5MB
- Supported formats: Images (for KYC documents)
- Storage: Local filesystem (uploads/ directory)

## 🐛 Error Handling

The application includes comprehensive error handling:
- Validation errors return 400 with details
- Authentication errors return 401
- Authorization errors return 403
- Not found errors return 404
- Server errors return 500 with safe error messages

## 📝 Logging

Request logging includes:
- HTTP method and URL
- Response status and time
- Request ID for tracing
- Error details (in development)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `npm test`
5. Submit a pull request

## 📄 License

This project is licensed under the ISC License.

## 🆘 Support

For support and questions:
- Check the API documentation
- Run the test suite to verify setup
- Review error logs for debugging
- Contact the development team
