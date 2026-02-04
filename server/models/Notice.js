const mongoose = require('mongoose');

const noticeSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    type: {
        type: String,
        required: true,
        enum: ['সাধারণ', 'জরুরি', 'নির্বাচন সংক্রান্ত', 'প্রার্থী তালিকা', 'ফলাফল', 'সতর্কতা']
    },
    contentType: {
        type: String,
        required: true,
        enum: ['text', 'pdf'],
        default: 'text'
    },
    message: {
        type: String,
        required: function() { return this.contentType === 'text'; }
    },
    pdfUrl: {
        type: String,
        required: function() { return this.contentType === 'pdf'; }
    },
    publishedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Admin',
        required: true
    },
    publishedByName: {
        type: String,
        required: true
    },
    isActive: {
        type: Boolean,
        default: true
    },
    priority: {
        type: Number,
        default: 0  // Higher number = higher priority
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

// Update the updatedAt timestamp before saving
noticeSchema.pre('save', function() {
    this.updatedAt = Date.now();
});

module.exports = mongoose.model('Notice', noticeSchema);
