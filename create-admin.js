/**
 * Script to create the first super admin
 * Run with: node create-admin.js
 */

const mongoose = require('mongoose');
const Admin = require('./models/Admin');
const { connectMongo } = require('./config/mongodb');

async function createSuperAdmin() {
  try {
    console.log('🚀 Creating Super Admin Account...\n');

    // Connect to database
    await connectMongo();
    console.log('✅ Connected to database');

    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      console.log('❌ Admin accounts already exist!');
      console.log('   Existing admin:', existingAdmin.username);
      console.log('   Use the web interface to create additional admins');
      process.exit(1);
    }

    // Create super admin
    const superAdmin = new Admin({
      username: 'superadmin',
      email: 'admin@naniwallet.com',
      password: 'admin123', // Change this!
      fullName: 'Super Administrator',
      role: 'super_admin',
      permissions: {
        users: { view: true, edit: true, delete: true },
        kyc: { view: true, approve: true, reject: true },
        transactions: { view: true, edit: true },
        reports: { view: true, export: true }
      }
    });

    await superAdmin.save();

    console.log('✅ Super Admin created successfully!');
    console.log('\n📋 Admin Details:');
    console.log(`   Username: ${superAdmin.username}`);
    console.log(`   Email: ${superAdmin.email}`);
    console.log(`   Password: admin123`);
    console.log(`   Role: ${superAdmin.role}`);
    
    console.log('\n🔐 Security Notice:');
    console.log('   ⚠️  Please change the default password immediately!');
    console.log('   ⚠️  Use strong passwords for production!');
    
    console.log('\n🌐 Access Admin Dashboard:');
    console.log('   1. Start the admin dashboard: cd naniwallet-admin && npm start');
    console.log('   2. Open: http://localhost:3001/login');
    console.log('   3. Login with the credentials above');
    
    console.log('\n🎉 Setup complete!');
    
  } catch (error) {
    console.error('❌ Error creating super admin:', error);
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

// Handle command line arguments for custom admin creation
const args = process.argv.slice(2);
if (args.length >= 4) {
  const [username, email, password, fullName] = args;
  
  createCustomAdmin(username, email, password, fullName);
} else {
  createSuperAdmin();
}

async function createCustomAdmin(username, email, password, fullName) {
  try {
    console.log('🚀 Creating Custom Admin Account...\n');

    await connectMongo();
    console.log('✅ Connected to database');

    const admin = new Admin({
      username,
      email: email.toLowerCase(),
      password,
      fullName,
      role: 'admin',
      permissions: {
        users: { view: true, edit: true, delete: false },
        kyc: { view: true, approve: true, reject: true },
        transactions: { view: true, edit: false },
        reports: { view: true, export: false }
      }
    });

    await admin.save();

    console.log('✅ Admin created successfully!');
    console.log('\n📋 Admin Details:');
    console.log(`   Username: ${admin.username}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Role: ${admin.role}`);
    
  } catch (error) {
    if (error.code === 11000) {
      console.error('❌ Username or email already exists');
    } else {
      console.error('❌ Error creating admin:', error.message);
    }
    process.exit(1);
  } finally {
    mongoose.connection.close();
  }
}

// Show usage if no arguments provided
if (args.length > 0 && args.length < 4) {
  console.log('Usage: node create-admin.js [username] [email] [password] [fullName]');
  console.log('Example: node create-admin.js john john@example.com password123 "John Doe"');
  console.log('\nOr run without arguments to create default super admin');
  process.exit(1);
}
