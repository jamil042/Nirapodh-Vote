const mongoose = require('mongoose');
require('dotenv').config();

console.log('🔗 Connecting to MongoDB...');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log('\n📦 Collections:', collections.map(c => c.name).join(', '));
    
    const noticesExists = collections.find(c => c.name === 'notices');
    console.log('\n🔍 Notices collection exists:', !!noticesExists);
    
    if (noticesExists) {
      const Notice = mongoose.connection.db.collection('notices');
      const count = await Notice.countDocuments();
      console.log('📊 Notices count:', count);
      
      if (count > 0) {
        const notices = await Notice.find({}).limit(5).toArray();
        console.log('\n📝 Sample notices:');
        notices.forEach((n, i) => {
          console.log(`  ${i+1}. ${n.title} - Type: ${n.type}, Active: ${n.isActive}`);
        });
      } else {
        console.log('⚠️  No notices found in database');
      }
    } else {
      console.log('⚠️  Notices collection does not exist');
    }
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
  });
