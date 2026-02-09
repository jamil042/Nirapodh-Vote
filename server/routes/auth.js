// Authentication Routes
const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const PreregisteredCitizen = require('../models/PreregisteredCitizen');
const OTP = require('../models/OTP');
const { normalizeBDPhone, generateOTP, getOTPExpiry } = require('../utils/helpers');
const { sendSMS } = require('../services/smsService');

// JWT Secret (in production, use a strong secret from .env)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Step 1: Check NID and Phone, Send OTP
router.post('/send-otp', async (req, res) => {
  try {
    let { nid, phoneNumber } = req.body;

    console.log('📥 Received send-otp request:', { nid, phoneNumber });

    // Validation
    if (!nid || !phoneNumber) {
      return res.status(400).json({ 
        success: false, 
        message: 'NID এবং ফোন নম্বর প্রদান করুন' 
      });
    }

    // Normalize NID - remove hyphens, spaces, and any non-digit characters
    nid = nid.replace(/[-\s]/g, '');
    console.log('🆔 Normalized NID:', nid);

    // Normalize phone number
    const normalizedPhone = normalizeBDPhone(phoneNumber);
    console.log('📱 Normalized phone:', normalizedPhone);
    
    if (!normalizedPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'অবৈধ ফোন নম্বর। বাংলাদেশি ফোন নম্বর ব্যবহার করুন (যেমন: 01788504010)' 
      });
    }

    // Check if NID and phone match in preregistered citizens
    const preregistered = await PreregisteredCitizen.findOne({ nid });
    console.log('🔍 Preregistered citizen found:', preregistered ? 'YES' : 'NO');
    
    if (!preregistered) {
      console.log('❌ NID not found in preregistered list:', nid);
      return res.status(404).json({ 
        success: false, 
        message: 'এই NID পূর্ব-নিবন্ধিত নাগরিক তালিকায় নেই' 
      });
    }

    // Check if already registered
    if (preregistered.hasRegistered) {
      return res.status(400).json({ 
        success: false, 
        message: 'এই NID ইতিমধ্যে নিবন্ধিত হয়েছে' 
      });
    }

    // Normalize stored phone number for comparison
    const normalizedStoredPhone = normalizeBDPhone(preregistered.mobileNumber);
    
    if (normalizedPhone !== normalizedStoredPhone) {
      return res.status(400).json({ 
        success: false, 
        message: 'ফোন নম্বর মিলছে না। পূর্ব-নিবন্ধিত ফোন নম্বর ব্যবহার করুন' 
      });
    }

    // Generate OTP
    const otpCode = generateOTP();
    const expiresAt = getOTPExpiry(process.env.OTP_EXPIRY_MINUTES || 2);

    // Delete any existing OTP for this NID
    await OTP.deleteMany({ nid });

    // Save OTP to database
    const otpRecord = new OTP({
      nid,
      phoneNumber: normalizedPhone,
      otp: otpCode,
      expiresAt
    });
    await otpRecord.save();

    // Send SMS via Gateway
    const smsMessage = `Your NirapodhVote OTP is ${otpCode}. Valid for 2 minutes.`;
    
    // Check if we're in development mode
    const isDevelopment = process.env.NODE_ENV !== 'production';
    
    // Check if SMS Service is configured (username not generic placeholder)
    if (process.env.SMS_USER && process.env.SMS_USER !== 'your_username_here') {
      try {
        await sendSMS(normalizedPhone, smsMessage);
        console.log(`✅ OTP sent via SMS to ${normalizedPhone}`);
      } catch (smsError) {
        console.error("SMS Send Failed:", smsError.message);
        
        // In development, allow OTP to work without SMS
        if (isDevelopment) {
          // console.log(`⚠️ Development Mode: OTP saved but SMS failed. OTP: ${otpCode}`);
        } else {
          // In production, SMS must work
          throw new Error("SMS sending failed");
        }
      }
    } else {
      console.log('⚠️ SMS Service not configured!');
      
      // In development mode, show OTP in console
      if (isDevelopment) {
        // console.log(`🔐 Development Mode - OTP for ${normalizedPhone}: ${otpCode}`);
      }
    }

    // Prepare response data
    const responseData = {
      nid,
      phoneNumber: normalizedPhone,
      expiresIn: process.env.OTP_EXPIRY_MINUTES || 2
    };

    // In development mode, include OTP in response for easy testing
    /*
    if (isDevelopment) {
      responseData.devOtp = otpCode;
    }
    */

    res.json({
      success: true,
      message: 'OTP আপনার ফোনে পাঠানো হয়েছে',
      data: responseData
    });
  } catch (error) {
    console.error('Send OTP error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'OTP পাঠাতে ব্যর্থ হয়েছে। আবার চেষ্টা করুন' 
    });
  }
});

// Step 2: Verify OTP and Register User
router.post('/verify-otp-register', async (req, res) => {
  try {
    let { nid, otp, password, presentAddress } = req.body;

    // Validation
    if (!nid || !otp || !password || !presentAddress) {
      return res.status(400).json({ 
        success: false, 
        message: 'সকল তথ্য প্রদান করুন' 
      });
    }

    // Normalize NID - remove hyphens, spaces, and any non-digit characters
    nid = nid.replace(/[-\s]/g, '');
    console.log('🆔 Normalized NID for OTP verification:', nid);

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false, 
        message: 'পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে' 
      });
    }

    // Find OTP record
    const otpRecord = await OTP.findOne({ nid, otp, verified: false });
    console.log('🔍 OTP record found:', otpRecord ? 'YES' : 'NO');
    
    if (!otpRecord) {
      return res.status(400).json({ 
        success: false, 
        message: 'অবৈধ অথবা মেয়াদোত্তীর্ণ OTP' 
      });
    }

    // Check if OTP has expired
    if (new Date() > otpRecord.expiresAt) {
      await OTP.deleteOne({ _id: otpRecord._id });
      return res.status(400).json({ 
        success: false, 
        message: 'OTP মেয়াদোত্তীর্ণ হয়েছে। নতুন OTP পাঠান' 
      });
    }

    // Get preregistered citizen data
    const preregistered = await PreregisteredCitizen.findOne({ nid });
    
    if (!preregistered) {
      return res.status(404).json({ 
        success: false, 
        message: 'পূর্ব-নিবন্ধিত নাগরিক তথ্য পাওয়া যায়নি' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ nid });
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        message: 'এই NID ইতিমধ্যে নিবন্ধিত আছে' 
      });
    }

    // Create new user with preregistered data
    const user = new User({
      nid: preregistered.nid,
      password,
      name: preregistered.name,
      dob: preregistered.dob,
      fatherName: preregistered.fatherName,
      motherName: preregistered.motherName,
      permanentAddress: preregistered.permanentAddress,
      presentAddress,
      votingArea: preregistered.votingArea
    });

    await user.save();

    // Mark OTP as verified
    otpRecord.verified = true;
    await otpRecord.save();

    // Update preregistered citizen record
    preregistered.hasRegistered = true;
    preregistered.userId = user._id;
    await preregistered.save();

    // Generate JWT token
    const token = jwt.sign({ id: user._id, nid: user.nid }, JWT_SECRET, { expiresIn: '7d' });

    res.status(201).json({
      success: true,
      message: 'রেজিস্ট্রেশন সফল হয়েছে',
      token,
      user: {
        id: user._id,
        nid: user.nid,
        name: user.name,
        votingArea: user.votingArea,
        hasVoted: user.hasVoted
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'রেজিস্ট্রেশন ব্যর্থ হয়েছে: ' + error.message 
    });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  try {
    const { nid, password } = req.body;

    // Validation
    if (!nid || !password) {
      return res.status(400).json({ 
        success: false, 
        message: 'NID এবং পাসওয়ার্ড প্রদান করুন' 
      });
    }

    // Find user
    const user = await User.findOne({ nid });
    console.log(`[LOGIN] Attempt for NID: ${nid}`);
    if (!user) {
      console.log(`[LOGIN] User not found for NID: ${nid}`);
      return res.status(401).json({ 
        success: false, 
        message: 'ভুল NID অথবা পাসওয়ার্ড' 
      });
    }

    // Check password
    console.log(`[LOGIN] User found. Hashed Password: ${user.password.substring(0, 10)}...`);
    const isMatch = await user.comparePassword(password);
    console.log(`[LOGIN] Password match result: ${isMatch} for input length: ${password.length}`);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: 'ভুল NID অথবা পাসওয়ার্ড' 
      });
    }

    // Fetch voting area from PreregisteredCitizen collection
    const preregisteredCitizen = await PreregisteredCitizen.findOne({ nid });
    const votingArea = preregisteredCitizen ? preregisteredCitizen.votingArea : 'N/A';
    console.log(`[LOGIN] Fetched votingArea from preregistered: ${votingArea}`);

    // Generate JWT token
    const token = jwt.sign({ id: user._id, nid: user.nid }, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: 'লগইন সফল হয়েছে',
      token,
      user: {
        id: user._id,
        nid: user.nid,
        name: user.name,
        dob: user.dob,
        fatherName: user.fatherName,
        motherName: user.motherName,
        presentAddress: user.presentAddress,
        permanentAddress: user.permanentAddress,
        votingArea: votingArea,
        hasVoted: user.hasVoted,
        votedAt: user.votedAt
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'লগইন ব্যর্থ হয়েছে' 
    });
  }
});

// Get User Info (Protected)
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'অনুমোদন প্রয়োজন' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ success: false, message: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি' });
    }

    console.log('📤 Sending user data to frontend:', {
      id: user._id,
      nid: user.nid,
      name: user.name,
      dob: user.dob,
      fatherName: user.fatherName,
      motherName: user.motherName,
      presentAddress: user.presentAddress,
      votingArea: user.votingArea
    });

    res.json({
      success: true,
      user: {
        id: user._id,
        nid: user.nid,
        name: user.name,
        dob: user.dob,
        fatherName: user.fatherName,
        motherName: user.motherName,
        presentAddress: user.presentAddress,
        permanentAddress: user.permanentAddress,
        votingArea: user.votingArea,
        hasVoted: user.hasVoted,
        votedAt: user.votedAt
      }
    });
  } catch (error) {
    console.error('Auth error:', error);
    res.status(401).json({ success: false, message: 'অবৈধ টোকেন' });
  }
});

module.exports = router;
