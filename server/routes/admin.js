// Admin Routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Vote = require('../models/Vote');
const Ballot = require('../models/Ballot');
const Candidate = require('../models/Candidate');
const { sendAdminCredentials } = require('../services/emailService');
const { authenticateAdmin, authenticateSuperAdmin } = require('../utils/helpers');

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
    const { name, location, startDate, endDate } = req.body;

    if (!name || !location) {
      return res.status(400).json({
        success: false,
        message: 'ব্যালটের নাম এবং এলাকা প্রদান করুন'
      });
    }
    
    // Validate dates if provided
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'শেষ তারিখ অবশ্যই শুরুর তারিখের পরে হতে হবে'
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
      ...(startDate && { startDate: new Date(startDate) }),
      ...(endDate && { endDate: new Date(endDate) }),
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

// Get all unique ballot locations (optionally filtered by ballot name)
router.get('/ballot-locations', authenticateAdmin, async (req, res) => {
  try {
    const { ballotName } = req.query;
    
    let query = {};
    if (ballotName) {
      query.name = ballotName;
    }
    
    const ballotLocations = await Ballot.distinct('location', query);
    
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

// Update ballot dates
router.put('/ballots/:id', authenticateAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.body;
    
    const ballot = await Ballot.findById(req.params.id);
    
    if (!ballot) {
      return res.status(404).json({
        success: false,
        message: 'ব্যালট পাওয়া যায়নি'
      });
    }

    // Validate dates if both provided
    if (startDate && endDate && new Date(startDate) >= new Date(endDate)) {
      return res.status(400).json({
        success: false,
        message: 'শেষ তারিখ অবশ্যই শুরুর তারিখের পরে হতে হবে'
      });
    }

    // Check if voting has already started
    if (ballot.startDate && new Date() >= ballot.startDate) {
      return res.status(403).json({
        success: false,
        message: 'ভোট ইতিমধ্যে শুরু হয়ে গেছে। তারিখ পরিবর্তন করা যাবে না।'
      });
    }

    // Update dates
    if (startDate !== undefined) ballot.startDate = startDate ? new Date(startDate) : null;
    if (endDate !== undefined) ballot.endDate = endDate ? new Date(endDate) : null;

    await ballot.save();

    res.json({
      success: true,
      message: 'ব্যালটের তারিখ সফলভাবে আপডেট হয়েছে',
      ballot: {
        id: ballot._id,
        name: ballot.name,
        location: ballot.location,
        startDate: ballot.startDate,
        endDate: ballot.endDate
      }
    });
  } catch (error) {
    console.error('Update ballot error:', error);
    res.status(500).json({
      success: false,
      message: 'ব্যালট আপডেট করতে ব্যর্থ হয়েছে'
    });
  }
});

// Delete ballot (superadmin only)
router.delete('/ballots/:id', authenticateSuperAdmin, async (req, res) => {
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
      message: 'ব্যালট সফলভাবে মুছে ফেলা হয়েছে এবং সকল অ্যাডমিনের জন্য সরানো হয়েছে'
    });
  } catch (error) {
    console.error('Delete ballot error:', error);
    res.status(500).json({
      success: false,
      message: 'ব্যালট মুছে ফেলতে ব্যর্থ হয়েছে'
    });
  }
});

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

// ===== CANDIDATE MANAGEMENT ROUTES =====

// Create/Save candidates (when ballot form is submitted)
router.post('/candidates', authenticateAdmin, async (req, res) => {
  try {
    const { ballotName, area, startDate, endDate, candidates } = req.body;

    if (!ballotName || !area || !candidates || !Array.isArray(candidates)) {
      return res.status(400).json({
        success: false,
        message: 'ব্যালটের নাম, এলাকা এবং প্রার্থী তথ্য প্রদান করুন'
      });
    }

    // Find or update ballot with dates
    if (startDate && endDate) {
      let ballot = await Ballot.findOne({ name: ballotName, location: area });
      
      if (ballot) {
        // Update existing ballot with dates
        ballot.startDate = new Date(startDate);
        ballot.endDate = new Date(endDate);
        await ballot.save();
        console.log('✅ Ballot dates updated:', {
          name: ballotName,
          location: area,
          startDate: ballot.startDate,
          endDate: ballot.endDate
        });
      } else {
        // Create new ballot with dates
        ballot = new Ballot({
          name: ballotName,
          location: area,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          createdBy: req.admin._id
        });
        await ballot.save();
        console.log('✅ Ballot created with dates:', {
          name: ballotName,
          location: area,
          startDate: ballot.startDate,
          endDate: ballot.endDate
        });
      }
    }

    // Save all candidates
    const savedCandidates = [];
    for (const candidateData of candidates) {
      const candidate = new Candidate({
        name: candidateData.name,
        party: candidateData.party,
        ballotName: ballotName,
        area: area,
        image: candidateData.image || 'assets/images/default-avatar.png',
        symbol: candidateData.symbol || '',
        bio: candidateData.bio || '',
        manifesto: candidateData.manifesto || '',
        socialWork: candidateData.socialWork || '',
        partyHistory: candidateData.partyHistory || '',
        status: candidateData.status || 'active',
        createdBy: req.admin._id
      });

      await candidate.save();
      savedCandidates.push(candidate);
    }

    res.json({
      success: true,
      message: `${savedCandidates.length}টি প্রার্থী সফলভাবে যোগ হয়েছে`,
      candidates: savedCandidates
    });
  } catch (error) {
    console.error('Create candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রার্থী যোগ করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get all candidates
router.get('/candidates', authenticateAdmin, async (req, res) => {
  try {
    const { ballotName, area } = req.query;
    
    let query = {};
    if (ballotName) query.ballotName = ballotName;
    if (area) query.area = area;

    const candidates = await Candidate.find(query)
      .populate('createdBy', 'username')
      .sort({ createdAt: -1 });

    // Add ballot information to each candidate
    const candidatesWithBallot = await Promise.all(candidates.map(async (candidate) => {
      const ballot = await Ballot.findOne({
        name: candidate.ballotName,
        location: candidate.area
      });
      
      const candidateObj = candidate.toObject();
      candidateObj.ballot = ballot ? {
        _id: ballot._id,
        startDate: ballot.startDate,
        endDate: ballot.endDate
      } : null;
      
      return candidateObj;
    }));

    res.json({
      success: true,
      candidates: candidatesWithBallot
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রার্থী তালিকা লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get single candidate by ID
router.get('/candidates/:id', authenticateAdmin, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id)
      .populate('createdBy', 'username');

    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'প্রার্থী পাওয়া যায়নি'
      });
    }

    res.json({
      success: true,
      candidate
    });
  } catch (error) {
    console.error('Get candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রার্থী তথ্য লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Update candidate
router.put('/candidates/:id', authenticateAdmin, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'প্রার্থী পাওয়া যায়নি'
      });
    }

    // Check if voting has started for this candidate's ballot
    const ballot = await Ballot.findOne({ 
      name: candidate.ballotName, 
      location: candidate.area 
    });

    // If ballot exists and has startDate, check if voting has started
    if (ballot && ballot.startDate) {
      const now = new Date();
      const startDate = new Date(ballot.startDate);
      
      if (now >= startDate) {
        console.log('❌ Edit blocked - Voting started:', {
          candidateName: candidate.name,
          startDate: ballot.startDate,
          now: now.toISOString()
        });
        return res.status(403).json({
          success: false,
          message: 'ভোট শুরু হয়ে গেছে। এখন প্রার্থীর তথ্য সম্পাদনা করা যাবে না।'
        });
      }
    }

    // Check if user is superadmin or creator
    if (req.admin.role !== 'superadmin' && candidate.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'আপনার এই প্রার্থীর তথ্য সম্পাদনার অনুমতি নেই'
      });
    }

    // Update candidate fields
    const updateFields = ['name', 'party', 'image', 'symbol', 'bio', 'manifesto', 'socialWork', 'partyHistory', 'status'];
    updateFields.forEach(field => {
      if (req.body[field] !== undefined) {
        candidate[field] = req.body[field];
      }
    });

    await candidate.save();

    res.json({
      success: true,
      message: 'প্রার্থীর তথ্য সফলভাবে আপডেট হয়েছে',
      candidate
    });
  } catch (error) {
    console.error('Update candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রার্থীর তথ্য আপডেট করতে ব্যর্থ হয়েছে'
    });
  }
});

// Delete candidate (for superadmin or creator)
router.delete('/candidates/:id', authenticateAdmin, async (req, res) => {
  try {
    const candidate = await Candidate.findById(req.params.id);
    
    if (!candidate) {
      return res.status(404).json({
        success: false,
        message: 'প্রার্থী পাওয়া যায়নি'
      });
    }

    // Check if voting has started for this candidate's ballot
    const ballot = await Ballot.findOne({ 
      name: candidate.ballotName, 
      location: candidate.area 
    });

    // If ballot exists and has startDate, check if voting has started
    if (ballot && ballot.startDate) {
      const now = new Date();
      const startDate = new Date(ballot.startDate);
      
      if (now >= startDate) {
        console.log('❌ Delete blocked - Voting started:', {
          candidateName: candidate.name,
          startDate: ballot.startDate,
          now: now.toISOString()
        });
        return res.status(403).json({
          success: false,
          message: 'ভোট শুরু হয়ে গেছে। এখন প্রার্থী মুছা যাবে না।'
        });
      }
    }

    // Check if user is superadmin or creator
    if (req.admin.role !== 'superadmin' && candidate.createdBy.toString() !== req.admin._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'আপনার এই প্রার্থী মুছার অনুমতি নেই'
      });
    }

    await Candidate.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'প্রার্থী সফলভাবে মুছে ফেলা হয়েছে'
    });
  } catch (error) {
    console.error('Delete candidate error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রার্থী মুছে ফেলতে ব্যর্থ হয়েছে'
    });
  }
});

module.exports = router;
