// Configuration example file
// Copy this to config.js and update with your actual values

module.exports = {
  // Database Configuration
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/naniwallet'
  },

  // JWT Configuration
  jwt: {
    secret: process.env.JWT_SECRET || 'your-super-secret-jwt-key-here',
    expiresIn: '24h'
  },

  // Web3Auth Configuration
  web3auth: {
    clientId: process.env.WEB3AUTH_CLIENT_ID || 'your-web3auth-client-id',
    verifier: process.env.WEB3AUTH_VERIFIER || 'your-web3auth-verifier'
  },

  // Email Configuration (for OTP)
  email: {
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port: process.env.EMAIL_PORT || 587,
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 3000,
    env: process.env.NODE_ENV || 'development'
  },

  // Blockchain Configuration
  blockchain: {
    ethereum: {
      rpcUrl: process.env.ETHEREUM_RPC_URL || 'https://rpc.ankr.com/eth'
    },
    polygon: {
      rpcUrl: process.env.POLYGON_RPC_URL || 'https://rpc.ankr.com/polygon'
    }
  },

  // API Keys (for production)
  apis: {
    etherscan: process.env.ETHERSCAN_API_KEY || 'your-etherscan-api-key',
    coinmarketcap: process.env.COINMARKETCAP_API_KEY || 'your-coinmarketcap-api-key'
  }
};
