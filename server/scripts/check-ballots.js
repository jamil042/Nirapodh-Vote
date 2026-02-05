require('dotenv').config();
const mongoose = require('mongoose');
const Ballot = require('../models/Ballot');

async function checkBallots() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const ballots = await Ballot.find({});
    
    console.log('\n📊 Total Ballots:', ballots.length);
    
    if (ballots.length > 0) {
      console.log('\n📋 Existing Ballots:');
      ballots.forEach((ballot, index) => {
        console.log(`\n${index + 1}. Name: "${ballot.name}"`);
        console.log(`   Location: "${ballot.location}"`);
        console.log(`   ID: ${ballot._id}`);
      });
    } else {
      console.log('\n✅ No ballots found in database');
    }

    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkBallots();
