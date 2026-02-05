// Script to update existing ballot with dates
require('dotenv').config();
const mongoose = require('mongoose');

const ballotSchema = new mongoose.Schema({
  name: String,
  location: String,
  startDate: Date,
  endDate: Date,
  createdBy: mongoose.Schema.Types.ObjectId,
  createdAt: { type: Date, default: Date.now }
});

const Ballot = mongoose.model('Ballot', ballotSchema);

async function updateBallotDates() {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Find ballot "জাতীয় সংসদ নির্বাচন ২০২৬ - ঢাকা-১০"
    const ballot = await Ballot.findOne({
      name: 'জাতীয় সংসদ নির্বাচন ২০২৬',
      location: 'ঢাকা-১০'
    });

    if (!ballot) {
      console.log('❌ Ballot not found!');
      process.exit(1);
    }

    console.log('📋 Found ballot:', ballot.name, '-', ballot.location);
    console.log('Current startDate:', ballot.startDate);
    console.log('Current endDate:', ballot.endDate);

    // Set dates (you can modify these)
    const now = new Date();
    const startDate = new Date(now.getTime() + 2 * 60 * 1000); // 2 minutes from now
    const endDate = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

    ballot.startDate = startDate;
    ballot.endDate = endDate;
    
    await ballot.save();

    console.log('✅ Ballot dates updated!');
    console.log('New startDate:', ballot.startDate);
    console.log('New endDate:', ballot.endDate);
    console.log('\n⏰ Voting will start in 2 minutes from now');
    console.log('⏰ Voting will end in 24 hours from now');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateBallotDates();
