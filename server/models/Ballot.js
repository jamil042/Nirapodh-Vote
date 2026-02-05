// Ballot Model
const mongoose = require('mongoose');

const ballotSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  location: {
    type: String,
    required: true,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Method to check if voting has started
ballotSchema.methods.hasVotingStarted = function() {
  return new Date() >= this.startDate;
};

// Method to check if voting is ongoing
ballotSchema.methods.isVotingActive = function() {
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
};

// Create indexes for faster queries
ballotSchema.index({ name: 1 });
ballotSchema.index({ location: 1 });

module.exports = mongoose.model('Ballot', ballotSchema);
