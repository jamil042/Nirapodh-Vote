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
    console.log('📊 Fetching dashboard statistics...');
    
    const totalUsers = await User.countDocuments();
    console.log('✅ Total users:', totalUsers);
    
    const totalVotes = await Vote.countDocuments();
    console.log('✅ Total votes:', totalVotes);
    
    const votersWhoVoted = await User.countDocuments({ hasVoted: true });
    console.log('✅ Voters who voted:', votersWhoVoted);
    
    const totalBallots = await Ballot.countDocuments();
    console.log('✅ Total ballots:', totalBallots);

    const stats = {
      totalUsers,
      totalVotes,
      totalBallots,
      votersWhoVoted,
      pendingVoters: totalUsers - votersWhoVoted,
      turnoutPercentage: totalUsers > 0 ? ((votersWhoVoted / totalUsers) * 100).toFixed(2) : 0
    };
    
    console.log('✅ Statistics ready:', stats);

    res.json({
      success: true,
      statistics: stats
    });
  } catch (error) {
    console.error('❌ Admin statistics error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে' 
    });
  }
});

// Chart Data - real-time turnout trend & results summary
router.get('/chart-data', authenticateAdmin, async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();

    // === Turnout Trend: votes grouped by hour today ===
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const hourlyVotes = await Vote.aggregate([
      { $match: { timestamp: { $gte: todayStart } } },
      {
        $group: {
          _id: { $hour: '$timestamp' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    // If no votes today, try all-time grouped by date
    let turnoutLabels = [];
    let turnoutData = [];

    if (hourlyVotes.length > 0) {
      // Build hourly cumulative turnout for today
      let cumulative = 0;
      for (const hv of hourlyVotes) {
        cumulative += hv.count;
        const hour = hv._id;
        const label = hour < 12 ? `${hour === 0 ? 12 : hour}AM` 
                    : hour === 12 ? '12PM'
                    : `${hour - 12}PM`;
        turnoutLabels.push(label);
        turnoutData.push(totalUsers > 0 ? Math.round((cumulative / totalUsers) * 100) : 0);
      }
    } else {
      // All-time: group by date
      const dailyVotes = await Vote.aggregate([
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': 1 } },
        { $limit: 10 }
      ]);

      let cumulative = 0;
      for (const dv of dailyVotes) {
        cumulative += dv.count;
        turnoutLabels.push(dv._id);
        turnoutData.push(totalUsers > 0 ? Math.round((cumulative / totalUsers) * 100) : 0);
      }
    }

    // === Results Summary: votes per candidate across all ballots ===
    const candidateVotes = await Vote.aggregate([
      {
        $group: {
          _id: '$candidate',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    // Populate candidate names
    const resultLabels = [];
    const resultData = [];
    for (const cv of candidateVotes) {
      const candidate = await Candidate.findById(cv._id).select('name party');
      if (candidate) {
        resultLabels.push(candidate.name);
      } else {
        resultLabels.push('অজানা');
      }
      resultData.push(cv.count);
    }

    res.json({
      success: true,
      turnout: { labels: turnoutLabels, data: turnoutData },
      results: { labels: resultLabels, data: resultData }
    });
  } catch (error) {
    console.error('❌ Chart data error:', error);
    res.status(500).json({ success: false, message: 'চার্ট ডেটা লোড ব্যর্থ' });
  }
});

// Get All Users
router.get('/users', authenticateAdmin, async (req, res) => {
  try {
    const { area } = req.query;
    
    // Build query
    const query = {};
    if (area) {
      query.votingArea = area;
    }
    
    const users = await User.find(query).select('-password').sort({ createdAt: -1 });
    
    res.json({
      success: true,
      users,
      count: users.length
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

// Get ballot results (Admin endpoint)
router.get('/results/:ballotId', authenticateAdmin, async (req, res) => {
  try {
    const { ballotId } = req.params;
    console.log('📊 Admin results request for ballot:', ballotId);
    
    // Get ballot
    const ballot = await Ballot.findById(ballotId);
    if (!ballot) {
      console.log('❌ Ballot not found:', ballotId);
      return res.status(404).json({
        success: false,
        message: 'ব্যালট পাওয়া যায়নি'
      });
    }
    
    console.log('✅ Ballot found:', ballot.name, '-', ballot.location);
    
    // Get all candidates for this ballot
    const candidates = await Candidate.find({
      ballotName: ballot.name,
      area: ballot.location,
      status: 'active'
    });
    
    console.log('📋 Candidates found:', candidates.length);
    
    // Count votes for each candidate
    const results = [];
    let totalVotes = 0;
    
    for (const candidate of candidates) {
      const voteCount = await Vote.countDocuments({
        ballotId: ballotId,
        candidate: candidate._id
      });
      
      console.log(`  - ${candidate.name}: ${voteCount} votes`);
      
      results.push({
        candidateId: candidate._id,
        name: candidate.name,
        party: candidate.party,
        image: candidate.image,
        symbol: candidate.symbol,
        voteCount: voteCount
      });
      
      totalVotes += voteCount;
    }
    
    // Sort by vote count (highest first)
    results.sort((a, b) => b.voteCount - a.voteCount);
    
    console.log('✅ Total votes:', totalVotes);
    
    res.json({
      success: true,
      ballot: {
        id: ballot._id,
        name: ballot.name,
        location: ballot.location
      },
      results: results,
      totalVotes: totalVotes
    });
  } catch (error) {
    console.error('❌ Get admin results error:', error);
    res.status(500).json({
      success: false,
      message: 'ফলাফল লোড করতে ব্যর্থ হয়েছে'
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

    // Check if voting is currently ongoing for this candidate's ballot
    const ballot = await Ballot.findOne({ 
      name: candidate.ballotName, 
      location: candidate.area 
    });

    // If ballot exists with dates, check if voting is ongoing
    if (ballot && ballot.startDate && ballot.endDate) {
      const now = new Date();
      const startDate = new Date(ballot.startDate);
      const endDate = new Date(ballot.endDate);
      
      if (now >= startDate && now <= endDate) {
        console.log('❌ Edit blocked - Voting ongoing:', {
          candidateName: candidate.name,
          startDate: ballot.startDate,
          endDate: ballot.endDate,
          now: now.toISOString()
        });
        return res.status(403).json({
          success: false,
          message: 'ভোট চলছে। এখন প্রার্থীর তথ্য সম্পাদনা করা যাবে না।'
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

    // Check if voting is currently ongoing for this candidate's ballot
    const ballot = await Ballot.findOne({ 
      name: candidate.ballotName, 
      location: candidate.area 
    });

    // If ballot exists with dates, check if voting is ongoing
    if (ballot && ballot.startDate && ballot.endDate) {
      const now = new Date();
      const startDate = new Date(ballot.startDate);
      const endDate = new Date(ballot.endDate);
      
      if (now >= startDate && now <= endDate) {
        console.log('❌ Delete blocked - Voting ongoing:', {
          candidateName: candidate.name,
          startDate: ballot.startDate,
          endDate: ballot.endDate,
          now: now.toISOString()
        });
        return res.status(403).json({
          success: false,
          message: 'ভোট চলছে। এখন প্রার্থী মুছা যাবে না।'
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

// ===================================
// ADMIN TO ADMIN CHAT ROUTES
// ===================================

// Get all admins (for admin-to-admin chat list)
router.get('/all-admins', authenticateAdmin, async (req, res) => {
  try {
    const admins = await Admin.find({}, 'username email role fullName createdAt')
      .sort({ role: -1, username: 1 }); // Superadmin first, then by username

    // Exclude current admin from the list
    const otherAdmins = admins.filter(admin => 
      admin._id.toString() !== req.admin._id.toString()
    );

    res.json({
      success: true,
      admins: otherAdmins.map(admin => ({
        id: admin._id,
        username: admin.username,
        email: admin.email,
        role: admin.role,
        fullName: admin.fullName || admin.username,
        createdAt: admin.createdAt
      }))
    });
  } catch (error) {
    console.error('Get all admins error:', error);
    res.status(500).json({
      success: false,
      message: 'অ্যাডমিন তালিকা লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

module.exports = router;
