// Vote Model
const mongoose = require('mongoose');

const voteSchema = new mongoose.Schema({
  candidate: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Candidate',
    required: true
  },
  ballotId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Ballot',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  nid: {
    type: String,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  ipAddress: {
    type: String
  }
});

// Compound index to ensure one vote per user per ballot
voteSchema.index({ userId: 1, ballotId: 1 }, { unique: true });

module.exports = mongoose.model('Vote', voteSchema);
