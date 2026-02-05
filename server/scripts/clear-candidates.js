// Script to remove all existing candidates from database
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

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
