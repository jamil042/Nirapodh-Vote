// Voting Routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Vote = require('../models/Vote');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Middleware to verify JWT
const authenticateToken = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'অনুমোদন প্রয়োজন' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = await User.findById(decoded.id);
    if (!req.user) {
      return res.status(404).json({ success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি' });
    }
    next();
  } catch (error) {
    res.status(401).json({ success: false, message: 'অবৈধ টোকেন' });
  }
};

// Cast Vote
router.post('/cast', authenticateToken, async (req, res) => {
  try {
    const { candidate, ballotId } = req.body;
    const Ballot = require('../models/Ballot');
    const Candidate = require('../models/Candidate');

    // Validation
    if (!candidate || !ballotId) {
      return res.status(400).json({ 
        success: false, 
        message: 'প্রার্থী এবং ব্যালট নির্বাচন করুন' 
      });
    }

    // Verify ballot exists and is active
    const ballot = await Ballot.findById(ballotId);
    if (!ballot) {
      return res.status(404).json({
        success: false,
        message: 'ব্যালট পাওয়া যায়নি'
      });
    }

    // Check if ballot is for user's area
    if (ballot.location !== req.user.votingArea) {
      return res.status(403).json({
        success: false,
        message: 'এই ব্যালট আপনার এলাকার জন্য নয়'
      });
    }

    // Check if voting is active
    if (ballot.startDate && ballot.endDate) {
      const now = new Date();
      if (now < new Date(ballot.startDate) || now > new Date(ballot.endDate)) {
        return res.status(400).json({
          success: false,
          message: 'ভোটিং বর্তমানে সক্রিয় নয়'
        });
      }
    }

    // Verify candidate exists and belongs to this ballot
    const candidateDoc = await Candidate.findById(candidate);
    if (!candidateDoc || candidateDoc.status !== 'active') {
      return res.status(404).json({
        success: false,
        message: 'প্রার্থী পাওয়া যায়নি'
      });
    }

    if (candidateDoc.ballotName !== ballot.name || candidateDoc.area !== ballot.location) {
      return res.status(400).json({
        success: false,
        message: 'প্রার্থী এই ব্যালটের জন্য বৈধ নয়'
      });
    }

    // Check if user has already voted for this ballot
    const existingVote = await Vote.findOne({ 
      userId: req.user._id,
      ballotId: ballotId
    });
    
    if (existingVote) {
      return res.status(400).json({ 
        success: false, 
        message: 'আপনি এই নির্বাচনে ইতিমধ্যে ভোট দিয়েছেন' 
      });
    }

    // Create vote
    const vote = new Vote({
      candidate: candidate,
      ballotId: ballotId,
      userId: req.user._id,
      nid: req.user.nid,
      ipAddress: req.ip
    });

    await vote.save();

    res.json({
      success: true,
      message: 'ভোট সফলভাবে সম্পন্ন হয়েছে',
      votedAt: vote.timestamp
    });
  } catch (error) {
    console.error('Vote error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'ভোট দিতে ব্যর্থ হয়েছে' 
    });
  }
});

// DEPRECATED: Check Global Vote Status (DO NOT USE)
// This endpoint returns global hasVoted flag which is deprecated
// Use /vote/status/:ballotId instead to check ballot-specific vote status
router.get('/status', authenticateToken, async (req, res) => {
  try {
    // Return false by default since users can vote once per ballot
    res.json({
      success: true,
      hasVoted: false, // Always false since voting is now per-ballot
      message: 'Use /vote/status/:ballotId for ballot-specific status'
    });
  } catch (error) {
    console.error('Status error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'স্ট্যাটাস চেক করতে ব্যর্থ হয়েছে' 
    });
  }
});

// Check if user voted for specific ballot (RECOMMENDED)
router.get('/status/:ballotId', authenticateToken, async (req, res) => {
  try {
    const { ballotId } = req.params;
    
    const vote = await Vote.findOne({
      userId: req.user._id,
      ballotId: ballotId
    }).populate('candidate', 'name party');
    
    if (vote) {
      res.json({
        success: true,
        hasVoted: true,
        votedAt: vote.timestamp,
        candidate: vote.candidate
      });
    } else {
      res.json({
        success: true,
        hasVoted: false
      });
    }
  } catch (error) {
    console.error('Ballot status error:', error);
    res.status(500).json({
      success: false,
      message: 'স্ট্যাটাস চেক করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get Vote Statistics (Public)
router.get('/statistics', async (req, res) => {
  try {
    const totalVotes = await Vote.countDocuments();
    const candidateAVotes = await Vote.countDocuments({ candidate: 'candidate-a' });
    const candidateBVotes = await Vote.countDocuments({ candidate: 'candidate-b' });
    const candidateCVotes = await Vote.countDocuments({ candidate: 'candidate-c' });
    const candidateDVotes = await Vote.countDocuments({ candidate: 'candidate-d' });

    res.json({
      success: true,
      statistics: {
        total: totalVotes,
        candidateA: candidateAVotes,
        candidateB: candidateBVotes,
        candidateC: candidateCVotes,
        candidateD: candidateDVotes
      }
    });
  } catch (error) {
    console.error('Statistics error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'পরিসংখ্যান লোড করতে ব্যর্থ হয়েছে' 
    });
  }
});

// Get ballots for citizen's voting area
router.get('/ballots', authenticateToken, async (req, res) => {
  try {
    const Ballot = require('../models/Ballot');
    const votingArea = req.user.votingArea;
    
    if (!votingArea) {
      return res.status(400).json({
        success: false,
        message: 'আপনার ভোটিং এলাকা নির্ধারিত নেই'
      });
    }
    
    // Get ballots matching user's voting area
    const ballots = await Ballot.find({ location: votingArea })
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

// Get candidates for a specific ballot
router.get('/candidates/:ballotId', authenticateToken, async (req, res) => {
  try {
    const Ballot = require('../models/Ballot');
    const Candidate = require('../models/Candidate');
    const { ballotId } = req.params;
    
    // Get ballot
    const ballot = await Ballot.findById(ballotId);
    if (!ballot) {
      return res.status(404).json({
        success: false,
        message: 'ব্যালট পাওয়া যায়নি'
      });
    }
    
    // Verify ballot location matches user's voting area
    if (ballot.location !== req.user.votingArea) {
      return res.status(403).json({
        success: false,
        message: 'এই ব্যালট আপনার এলাকার জন্য নয়'
      });
    }
    
    // Get candidates for this ballot and area
    const candidates = await Candidate.find({
      ballotName: ballot.name,
      area: ballot.location,
      status: 'active'
    }).sort({ name: 1 });
    
    res.json({
      success: true,
      ballot,
      candidates
    });
  } catch (error) {
    console.error('Get candidates error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রার্থী লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get vote results for a specific ballot
router.get('/results/:ballotId', authenticateToken, async (req, res) => {
  try {
    const Ballot = require('../models/Ballot');
    const Candidate = require('../models/Candidate');
    const { ballotId } = req.params;
    
    // Get ballot
    const ballot = await Ballot.findById(ballotId);
    if (!ballot) {
      return res.status(404).json({
        success: false,
        message: 'ব্যালট পাওয়া যায়নি'
      });
    }
    
    // Get all candidates for this ballot
    const candidates = await Candidate.find({
      ballotName: ballot.name,
      area: ballot.location,
      status: 'active'
    });
    
    // Count votes for each candidate
    const results = [];
    let totalVotes = 0;
    
    for (const candidate of candidates) {
      const voteCount = await Vote.countDocuments({
        ballotId: ballotId,
        candidate: candidate._id
      });
      
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
    console.error('Get results error:', error);
    res.status(500).json({
      success: false,
      message: 'ফলাফল লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

module.exports = router;
