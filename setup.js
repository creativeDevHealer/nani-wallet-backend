/**
 * Backend setup script
 * Run with: node setup.js
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Setting up Nani Wallet Backend...\n');

// Check if .env exists
const envPath = path.join(__dirname, '.env');
const envExamplePath = path.join(__dirname, 'env.example');

if (!fs.existsSync(envPath)) {
  if (fs.existsSync(envExamplePath)) {
    console.log('📝 Creating .env file from template...');
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✅ .env file created');
    console.log('⚠️  Please edit .env with your configuration values\n');
  } else {
    console.log('❌ env.example not found');
  }
} else {
  console.log('✅ .env file already exists\n');
}

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
const kycUploadsDir = path.join(uploadsDir, 'kyc');

if (!fs.existsSync(uploadsDir)) {
  console.log('📁 Creating uploads directory...');
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log('✅ uploads directory created');
}

if (!fs.existsSync(kycUploadsDir)) {
  console.log('📁 Creating KYC uploads directory...');
  fs.mkdirSync(kycUploadsDir, { recursive: true });
  console.log('✅ KYC uploads directory created');
}

// Check if node_modules exists
const nodeModulesPath = path.join(__dirname, 'node_modules');
if (!fs.existsSync(nodeModulesPath)) {
  console.log('\n⚠️  Dependencies not installed');
  console.log('Run: npm install');
} else {
  console.log('\n✅ Dependencies are installed');
}

// Print next steps
console.log('\n🎯 Next Steps:');
console.log('1. Edit .env with your configuration');
console.log('2. Ensure MongoDB is running');
console.log('3. Run: npm run dev (development) or npm start (production)');
console.log('4. Test with: npm test');
console.log('\n📚 API will be available at: http://localhost:3000/api');
console.log('📖 Health check: http://localhost:3000/api/health');

console.log('\n🔧 Required Environment Variables:');
console.log('- MONGODB_URI (database connection)');
console.log('- JWT_SECRET (authentication secret)');
console.log('- SMTP_* (email configuration)');
console.log('- TELNYX_API_KEY (SMS configuration)');

console.log('\n🎉 Setup complete!');
