// Utility functions for phone normalization and OTP
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Normalize Bangladesh phone number to E.164 format (+8801XXXXXXXXX)
 * @param {string} phone - Input phone number
 * @returns {string|null} - Normalized phone number or null if invalid
 */
function normalizeBDPhone(phone) {
  if (!phone) return null;
  
  // Remove all spaces and hyphens
  phone = phone.replace(/\s|-/g, '');

  // Handle different formats
  if (phone.startsWith('01') && phone.length === 11) {
    return '+88' + phone;
  }
  if (phone.startsWith('8801') && phone.length === 13) {
    return '+' + phone;
  }
  if (phone.startsWith('+8801') && phone.length === 14) {
    return phone;
  }
  
  return null;
}

/**
 * Generate a random 6-digit OTP
 * @returns {string} - 6-digit OTP
 */
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Calculate OTP expiry time
 * @param {number} minutes - Number of minutes until expiry
 * @returns {Date} - Expiry date
 */
function getOTPExpiry(minutes = 2) {
  return new Date(Date.now() + minutes * 60 * 1000);
}

/**
 * Middleware to authenticate admin
 */
const authenticateAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'অনুমোদন প্রয়োজন' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.admin = await Admin.findById(decoded.id);
    if (!req.admin) {
      return res.status(403).json({ success: false, message: 'অ্যাক্সেস অস্বীকৃত' });
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'অবৈধ টোকেন' });
  }
};

/**
 * Middleware to authenticate superadmin
 */
const authenticateSuperAdmin = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'অনুমোদন প্রয়োজন' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const admin = await Admin.findById(decoded.id);
    
    if (!admin) {
      return res.status(403).json({ success: false, message: 'অ্যাক্সেস অস্বীকৃত' });
    }

    if (admin.role !== 'superadmin') {
      return res.status(403).json({ success: false, message: 'শুধুমাত্র সুপার অ্যাডমিন এই কাজ করতে পারবেন' });
    }

    req.admin = admin;
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'অবৈধ টোকেন' });
  }
};

module.exports = {
  normalizeBDPhone,
  generateOTP,
  getOTPExpiry,
  authenticateAdmin,
  authenticateSuperAdmin
};
