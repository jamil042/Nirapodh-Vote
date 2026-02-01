// Admin Routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Vote = require('../models/Vote');
const Ballot = require('../models/Ballot');
const { sendAdminCredentials } = require('../services/emailService');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Admin Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন' 
      });
    }

    // Find admin
    const admin = await Admin.findOne({ username });
    if (!admin) {
      return res.status(401).json({ 
        success: false, 
        message: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড' 
      });
    }

    // Check password
    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'ভুল ইউজারনেম অথবা পাসওয়ার্ড' 
      });
    }

    // Generate JWT token
    const token = jwt.sign(
      { id: admin._id, username: admin.username, role: admin.role }, 
      JWT_SECRET, 
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'লগইন সফল হয়েছে',
      token,
      admin: {
        id: admin._id,
        username: admin.username,
        role: admin.role,
        isFirstLogin: admin.isFirstLogin
      }
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'লগইন ব্যর্থ হয়েছে' 
    });
  }
});

// Middleware to verify admin token
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

// Get Dashboard Statistics
router.get('/statistics', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const totalVotes = await Vote.countDocuments();
    const votersWhoVoted = await User.countDocuments({ hasVoted: true });
    
    const candidateAVotes = await Vote.countDocuments({ candidate: 'candidate-a' });
    const candidateBVotes = await Vote.countDocuments({ candidate: 'candidate-b' });
    const candidateCVotes = await Vote.countDocuments({ candidate: 'candidate-c' });
    const candidateDVotes = await Vote.countDocuments({ candidate: 'candidate-d' });

    res.json({
      success: true,
      statistics: {
        totalUsers,
        totalVotes,
        votersWhoVoted,
        pendingVoters: totalUsers - votersWhoVoted,
        turnoutPercentage: totalUsers > 0 ? ((votersWhoVoted / totalUsers) * 100).toFixed(2) : 0,
        candidates: {
          candidateA: candidateAVotes,
          candidateB: candidateBVotes,
          candidateC: candidateCVotes,
          candidateD: candidateDVotes
        }
      }
    });
  } catch (error) {
    console.error('Admin statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে' 
    });
  }
});

// Get All Users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'ব্যবহারকারী লোড করতে ব্যর্থ হয়েছে' 
    });
  }
});

// Get All Votes
router.get('/votes', authenticateAdmin, async (req, res) => {
  try {
    const votes = await Vote.find()
      .populate('userId', 'name nid')
      .sort({ timestamp: -1 });
    
    res.json({
      success: true,
      votes
    });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'ভোট লোড করতে ব্যর্থ হয়েছে' 
    });
  }
});

// Create Initial Admin (Only for first setup)
router.post('/create-initial-admin', async (req, res) => {
  try {
    // Check if any admin exists
    const existingAdmin = await Admin.findOne();
    if (existingAdmin) {
      return res.status(400).json({ 
        success: false, 
        message: 'অ্যাডমিন ইতিমধ্যে বিদ্যমান' 
      });
    }

    const admin = new Admin({
      username: 'admin',
      password: 'admin123',
      role: 'superadmin'
    });

    await admin.save();

    res.json({
      success: true,
      message: 'প্রাথমিক অ্যাডমিন তৈরি হয়েছে',
      credentials: {
        username: 'admin',
        password: 'admin123'
      }
    });
  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'অ্যাডমিন তৈরি করতে ব্যর্থ হয়েছে' 
    });
  }
});

// ===== BALLOT MANAGEMENT ROUTES =====

// Create new ballot name/location
router.post('/ballots', authenticateAdmin, async (req, res) => {
  try {
    const { name, location } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: 'ব্যালটের নাম এবং এলাকা প্রদান করুন'
      });
    }

    // Check if ballot with same name and location already exists
    const existingBallot = await Ballot.findOne({ name, location });
    if (existingBallot) {
      return res.status(400).json({
        success: false,
        message: 'এই ব্যালট ইতিমধ্যে বিদ্যমান'
      });
    }

    const ballot = new Ballot({
      name: name.trim(),
      location: location.trim(),
      createdBy: req.admin._id
    });

    await ballot.save();

    res.json({
      success: true,
      message: 'ব্যালট সফলভাবে যোগ হয়েছে',
      ballot: {
        id: ballot._id,
        name: ballot.name,
        location: ballot.location
      }
    });
  } catch (error) {
    console.error('Create ballot error:', error);
    res.status(500).json({
      success: false,
      message: 'ব্যালট তৈরি করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get all unique ballot names
router.get('/ballot-names', authenticateAdmin, async (req, res) => {
  try {
    const ballotNames = await Ballot.distinct('name');
    
    res.json({
      success: true,
      ballotNames: ballotNames.sort()
    });
  } catch (error) {
    console.error('Get ballot names error:', error);
    res.status(500).json({
      success: false,
      message: 'ব্যালটের নাম লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get all unique ballot locations
router.get('/ballot-locations', authenticateAdmin, async (req, res) => {
  try {
    const ballotLocations = await Ballot.distinct('location');
    
    res.json({
      success: true,
      ballotLocations: ballotLocations.sort()
    });
  } catch (error) {
    console.error('Get ballot locations error:', error);
    res.status(500).json({
      success: false,
      message: 'নির্বাচন এলাকা লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get all ballots
router.get('/ballots', authenticateAdmin, async (req, res) => {
  try {
    const ballots = await Ballot.find()
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });
    
    res.json({
      success: true,
      ballots
    });
  } catch (error) {
    console.error('Get ballots error:', error);
    res.status(500).json({
      success: false,
      message: 'ব্যালট লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Delete ballot
router.delete('/ballots/:id', authenticateAdmin, async (req, res) => {
  try {
    const ballot = await Ballot.findByIdAndDelete(req.params.id);
    
    if (!ballot) {
      return res.status(404).json({
        success: false,
        message: 'ব্যালট পাওয়া যায়নি'
      });
    }

    res.json({
      success: true,
      message: 'ব্যালট সফলভাবে মুছে ফেলা হয়েছে'
    });
  } catch (error) {
    console.error('Delete ballot error:', error);
    res.status(500).json({
      success: false,
      message: 'ব্যালট মুছে ফেলতে ব্যর্থ হয়েছে'
    });
  }
});

// Middleware to verify superadmin
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

// Create new admin (superadmin only)
router.post('/create-admin', authenticateSuperAdmin, async (req, res) => {
  try {
    const { username, email, initialPassword } = req.body;

    // Validation
    if (!username || !email || !initialPassword) {
      return res.status(400).json({
        success: false,
        message: 'সকল তথ্য প্রদান করুন'
      });
    }

    // Check if admin already exists
    const existingAdmin = await Admin.findOne({ $or: [{ username }, { email }] });
    if (existingAdmin) {
      return res.status(400).json({
        success: false,
        message: 'এই ইউজারনেম অথবা ইমেইল দিয়ে ইতিমধ্যে একজন প্রশাসক আছেন'
      });
    }

    // Create new admin
    const newAdmin = new Admin({
      username,
      email,
      password: initialPassword,
      role: 'admin',
      isFirstLogin: true
    });

    await newAdmin.save();

    // Send credentials via email
    const emailResult = await sendAdminCredentials(email, username, initialPassword);

    res.json({
      success: true,
      message: 'নতুন প্রশাসক সফলভাবে তৈরি হয়েছে এবং ইমেইল পাঠানো হয়েছে',
      emailSent: emailResult.success,
      admin: {
        id: newAdmin._id,
        username: newAdmin.username,
        email: newAdmin.email,
        role: newAdmin.role
      }
    });

  } catch (error) {
    console.error('Create admin error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রশাসক তৈরি করতে ব্যর্থ হয়েছে',
      error: error.message
    });
  }
});

// Update password (first login or regular update)
router.post('/update-password', authenticateAdmin, async (req, res) => {
  try {
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে'
      });
    }

    // Update password
    req.admin.password = newPassword;
    req.admin.isFirstLogin = false;
    await req.admin.save();

    res.json({
      success: true,
      message: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে'
    });

  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে',
      error: error.message
    });
  }
});

// Get all admins (superadmin only)
router.get('/admins', authenticateSuperAdmin, async (req, res) => {
  try {
    const admins = await Admin.find().select('-password').sort({ createdAt: -1 });

    res.json({
      success: true,
      admins
    });

  } catch (error) {
    console.error('Get admins error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রশাসক তালিকা লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

module.exports = router;
