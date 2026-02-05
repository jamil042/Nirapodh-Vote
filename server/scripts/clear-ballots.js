require('dotenv').config();
const mongoose = require('mongoose');
const Ballot = require('../models/Ballot');

async function clearBallots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const result = await Ballot.deleteMany({});
    
    console.log(`\n✅ Deleted ${result.deletedCount} ballots from the database`);
    console.log('✅ Database cleaned successfully!');

    await mongoose.connection.close();
    console.log('✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

clearBallots();
