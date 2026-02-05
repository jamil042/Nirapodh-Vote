// Complaint Model
const mongoose = require('mongoose');

const complaintSchema = new mongoose.Schema({
  complaintId: {
    type: String,
    required: true,
    unique: true
  },
  citizenId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  citizenNID: {
    type: String,
    required: true
  },
  citizenName: {
    type: String,
    required: true
  },
  votingArea: {
    type: String,
    required: true
  },
  complaintType: {
    type: String,
    required: true,
    enum: ['ভোটের সমস্যা', 'প্রযুক্তিগত সমস্যা', 'নিরাপত্তা সমস্যা', 'অন্যান্য']
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  attachments: [{
    filename: String,
    originalName: String,
    path: String,
    mimetype: String,
    size: Number,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['প্রক্রিয়াধীন', 'উত্তর প্রদান', 'সমাধানকৃত', 'প্রত্যাখ্যাত'],
    default: 'প্রক্রিয়াধীন'
  },
  priority: {
    type: String,
    enum: ['সাধারণ', 'জরুরি', 'অত্যন্ত জরুরি'],
    default: 'সাধারণ'
  },
  adminResponse: {
    respondedBy: {
      type: String
    },
    respondedAt: {
      type: Date
    },
    message: {
      type: String
    },
    attachments: [{
      filename: String,
      originalName: String,
      path: String,
      mimetype: String,
      size: Number,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  submittedAt: {
    type: Date,
    default: Date.now
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Index for faster queries
complaintSchema.index({ citizenNID: 1, submittedAt: -1 });
complaintSchema.index({ status: 1, submittedAt: -1 });
complaintSchema.index({ complaintId: 1 });

module.exports = mongoose.model('Complaint', complaintSchema);
