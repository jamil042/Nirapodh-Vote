// Script to remove all existing candidates from database
const mongoose = require('mongoose');
require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nirapodh-vote';

async function clearCandidates() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const Candidate = require('../models/Candidate');

    // Delete all candidates
    const result = await Candidate.deleteMany({});
    console.log(`✅ Deleted ${result.deletedCount} candidates from the database`);

    console.log('\nDatabase cleaned successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

clearCandidates();
