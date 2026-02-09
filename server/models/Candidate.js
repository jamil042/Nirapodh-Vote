// Candidate Model
const mongoose = require('mongoose');

const candidateSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  party: {
    type: String,
    required: true,
    trim: true
  },
  ballotName: {
    type: String,
    required: true,
    trim: true
  },
  area: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    type: String, // Base64 or file path
    default: 'assets/images/default-avatar.png'
  },
  symbol: {
    type: String, // Base64 or file path
    default: ''
  },
  bio: {
    type: String,
    default: ''
  },
  manifesto: {
    type: String,
    default: ''
  },
  socialWork: {
    type: String,
    default: ''
  },
  partyHistory: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active'
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

// Create indexes
candidateSchema.index({ ballotName: 1, area: 1 });
candidateSchema.index({ name: 1 });
candidateSchema.index({ status: 1 });

module.exports = mongoose.model('Candidate', candidateSchema);
