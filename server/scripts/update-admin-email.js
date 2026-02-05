// Script to add email to existing admin
const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../models/Admin');

async function updateAdminEmail() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get username and email from command line arguments
    const username = process.argv[2];
    const email = process.argv[3];

    if (!username || !email) {
      console.log('Usage: node update-admin-email.js <username> <email>');
      console.log('Example: node update-admin-email.js admin admin@example.com');
      process.exit(1);
    }

    // Find and update admin
    const admin = await Admin.findOne({ username });
    
    if (!admin) {
      console.log(`❌ Admin with username "${username}" not found`);
      process.exit(1);
    }

    // Update email
    admin.email = email;
    await admin.save();

    console.log('✅ Admin updated successfully:');
    console.log('   Username:', admin.username);
    console.log('   Email:', admin.email);
    console.log('   Role:', admin.role);

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateAdminEmail();
