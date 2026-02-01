// Script to update an existing admin to superadmin
const mongoose = require('mongoose');
require('dotenv').config();
const Admin = require('../models/Admin');

async function createOrUpdateSuperAdmin() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Check if any superadmin exists
    const existingSuperAdmin = await Admin.findOne({ role: 'superadmin' });
    
    if (existingSuperAdmin) {
      console.log('✅ Superadmin already exists:');
      console.log('   Username:', existingSuperAdmin.username);
      console.log('   Email:', existingSuperAdmin.email);
      console.log('   Role:', existingSuperAdmin.role);
    } else {
      // Find the first admin to convert to superadmin
      const firstAdmin = await Admin.findOne({ role: 'admin' });
      
      if (firstAdmin) {
        // Update to superadmin
        firstAdmin.role = 'superadmin';
        await firstAdmin.save();
        
        console.log('✅ Admin converted to Superadmin:');
        console.log('   Username:', firstAdmin.username);
        console.log('   Email:', firstAdmin.email);
        console.log('   Role:', firstAdmin.role);
      } else {
        console.log('⚠️  No admin found in database. Please create an admin first.');
        console.log('');
        console.log('You can create a superadmin manually:');
        console.log('');
        console.log('Example:');
        console.log('const newSuperAdmin = new Admin({');
        console.log('  username: "SUPERADMIN-2026-001",');
        console.log('  email: "admin@example.com",');
        console.log('  password: "password123",');
        console.log('  role: "superadmin"');
        console.log('});');
        console.log('await newSuperAdmin.save();');
      }
    }

    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB');
    
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

createOrUpdateSuperAdmin();
