const mongoose = require('mongoose');
require('dotenv').config();

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected');
    
    // Get admin ID
    const Admin = mongoose.connection.db.collection('admins');
    const admin = await Admin.findOne({ username: 'admin' });
    
    if (!admin) {
      console.log('❌ Admin not found');
      process.exit(1);
    }
    
    console.log('👤 Admin found:', admin.username);
    
    // Insert test notice
    const Notice = mongoose.connection.db.collection('notices');
    const testNotice = {
      title: 'টেস্ট নোটিশ - Direct Insert',
      type: 'সাধারণ',
      contentType: 'text',
      message: 'এটি একটি পরীক্ষামূলক নোটিশ যা সরাসরি database এ insert করা হয়েছে',
      publishedBy: admin._id,
      publishedByName: admin.username,
      isActive: true,
      priority: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    const result = await Notice.insertOne(testNotice);
    console.log('✅ Notice inserted:', result.insertedId);
    
    // Verify
    const count = await Notice.countDocuments();
    console.log('📊 Total notices:', count);
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
