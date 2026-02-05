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
    required: false
  },
  endDate: {
    type: Date,
    required: false
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
  if (!this.startDate) return false;
  return new Date() >= this.startDate;
};

// Method to check if voting is ongoing
ballotSchema.methods.isVotingActive = function() {
  if (!this.startDate || !this.endDate) return false;
  const now = new Date();
  return now >= this.startDate && now <= this.endDate;
};

// Create indexes for faster queries
ballotSchema.index({ name: 1 });
ballotSchema.index({ location: 1 });

module.exports = mongoose.model('Ballot', ballotSchema);
