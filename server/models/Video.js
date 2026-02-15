// Video Model - For homepage promotional videos
const mongoose = require('mongoose');

const videoSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  videoType: {
    type: String,
    enum: ['youtube', 'upload'],
    required: true
  },
  // For YouTube videos
  youtubeUrl: {
    type: String,
    trim: true
  },
  youtubeId: {
    type: String,
    trim: true
  },
  // For uploaded videos
  cloudinaryUrl: {
    type: String,
    trim: true
  },
  cloudinaryId: {
    type: String,
    trim: true
  },
  thumbnailUrl: {
    type: String,
    trim: true
  },
  duration: {
    type: Number // in seconds
  },
  isActive: {
    type: Boolean,
    default: true
  },
  uploadedBy: {
    type: String,
    required: true
  },
  uploadedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for faster queries
videoSchema.index({ isActive: 1, uploadedAt: -1 });

module.exports = mongoose.model('Video', videoSchema);
