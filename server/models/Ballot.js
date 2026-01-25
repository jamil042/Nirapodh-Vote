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
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create indexes for faster queries
ballotSchema.index({ name: 1 });
ballotSchema.index({ location: 1 });

module.exports = mongoose.model('Ballot', ballotSchema);
