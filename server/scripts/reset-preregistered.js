require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const mongoose = require('mongoose');
const PreregisteredCitizen = require('../models/PreregisteredCitizen');
const User = require('../models/User');
const OTP = require('../models/OTP');

// MongoDB connection URI from .env or default
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nirapodh-vote';

async function resetPreregisteredRecords() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    console.log(`URI: ${MONGODB_URI}`);

    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);

    console.log('✅ Connected to MongoDB');

    // IDs of records to reset
    const recordIds = [
      new mongoose.Types.ObjectId('696a78234594db9cbfc19292'),
      new mongoose.Types.ObjectId('696a84474594db9cbfc1929c'),
      new mongoose.Types.ObjectId('696a94dc4c911ee58e653fb1')
    ];

    console.log('\n📋 Records to reset:');
    const recordsBeforeReset = await PreregisteredCitizen.find({ _id: { $in: recordIds } });
    const nidsToReset = recordsBeforeReset.map(r => r.nid);
    recordsBeforeReset.forEach((record) => {
      console.log(`  - ${record.mobileNumber} (${record.name}) - NID: ${record.nid}`);
    });

    // Delete User records with these NIDs
    console.log('\n🗑️  Deleting User records...');
    const userDeleteResult = await User.deleteMany({ nid: { $in: nidsToReset } });
    console.log(`   - Deleted ${userDeleteResult.deletedCount} User records`);

    // Delete OTP records with these NIDs
    console.log('\n🗑️  Deleting OTP records...');
    const otpDeleteResult = await OTP.deleteMany({ nid: { $in: nidsToReset } });
    console.log(`   - Deleted ${otpDeleteResult.deletedCount} OTP records`);

    // Update preregistered citizen records
    console.log('\n🔄 Resetting PreregisteredCitizen records...');
    const result = await PreregisteredCitizen.updateMany(
      { _id: { $in: recordIds } },
      { 
        $set: { isRegistered: false, hasRegistered: false },
        $unset: { userId: '' }
      }
    );

    console.log('✅ PreregisteredCitizen reset completed:');
    console.log(`   - Matched records: ${result.matchedCount}`);
    console.log(`   - Modified records: ${result.modifiedCount}`);

    // Show the updated records
    console.log('\n📝 Updated PreregisteredCitizen records:');
    const updatedRecords = await PreregisteredCitizen.find({ _id: { $in: recordIds } });
    updatedRecords.forEach((record) => {
      console.log(`   - ${record.mobileNumber} (${record.name})`);
      console.log(`     NID: ${record.nid}`);
      console.log(`     isRegistered: ${record.isRegistered}, hasRegistered: ${record.hasRegistered}, userId: ${record.userId || 'null'}`);
    });

    console.log('\n✅ All records reset successfully! Ready for OTP testing.');

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting preregistered records:', error.message);
    console.error(error);
    process.exit(1);
  }
}

resetPreregisteredRecords();
