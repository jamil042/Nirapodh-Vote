const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected');
    const Admin = mongoose.connection.db.collection('admins');
    const admins = await Admin.find({}).toArray();
    console.log('\n👥 Admins:');
    admins.forEach((a, i) => {
      console.log(`  ${i+1}. Username: ${a.username}, Role: ${a.role}, Email: ${a.email || 'N/A'}`);
    });
    process.exit(0);
  });
