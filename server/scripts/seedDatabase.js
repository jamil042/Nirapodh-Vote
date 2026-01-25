// server/scripts/seedDatabase.js
// Run this to populate initial data: node server/scripts/seedDatabase.js

require('dotenv').config();
const mongoose = require('mongoose');
const CitizenMaster = require('../models/CitizenMaster');
const Admin = require('../models/Admin');
const Candidate = require('../models/Candidate');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/nirapodh_vote';

// Sample citizen data (10 citizens)
const citizensData = [
  {
    nid: '1234567890123',
    name: 'মোঃ আবদুল করিম',
    fatherName: 'মোঃ আব্দুর রহমান',
    motherName: 'সালমা বেগম',
    dob: new Date('1990-01-15'),
    mobileNumber: '01712345678',
    votingArea: 'ঢাকা-১০',
    address: 'মিরপুর, ঢাকা',
    isRegistered: false
  },
  {
    nid: '9876543210987',
    name: 'রহিমা খাতুন',
    fatherName: 'মোঃ করিম উদ্দিন',
    motherName: 'নাজমা বেগম',
    dob: new Date('1992-05-20'),
    mobileNumber: '01823456789',
    votingArea: 'ঢাকা-১০',
    address: 'কল্যাণপুর, ঢাকা',
    isRegistered: false
  },
  {
    nid: '1111222233334',
    name: 'আলী হোসেন',
    fatherName: 'মোঃ হোসেন আলী',
    motherName: 'ফাতেমা বেগম',
    dob: new Date('1988-08-10'),
    mobileNumber: '01934567890',
    votingArea: 'ঢাকা-১০',
    address: 'শেওড়াপাড়া, ঢাকা',
    isRegistered: false
  },
  {
    nid: '5555666677778',
    name: 'সালমা আক্তার',
    fatherName: 'মোঃ নুরুল ইসলাম',
    motherName: 'রোকেয়া বেগম',
    dob: new Date('1995-03-25'),
    mobileNumber: '01745678901',
    votingArea: 'ঢাকা-১০',
    address: 'পল্লবী, ঢাকা',
    isRegistered: false
  },
  {
    nid: '9999888877776',
    name: 'কামরুল হাসান',
    fatherName: 'মোঃ হাসান আলী',
    motherName: 'জোহরা বেগম',
    dob: new Date('1985-12-05'),
    mobileNumber: '01656789012',
    votingArea: 'চট্টগ্রাম-২',
    address: 'আগ্রাবাদ, চট্টগ্রাম',
    isRegistered: false
  },
  {
    nid: '4444333322221',
    name: 'নাসরিন সুলতানা',
    fatherName: 'মোঃ সুলতান মাহমুদ',
    motherName: 'শাহনাজ বেগম',
    dob: new Date('1993-07-18'),
    mobileNumber: '01567890123',
    votingArea: 'চট্টগ্রাম-২',
    address: 'পাহাড়তলী, চট্টগ্রাম',
    isRegistered: false
  },
  {
    nid: '7777666655554',
    name: 'রফিকুল ইসলাম',
    fatherName: 'মোঃ ইসলাম উদ্দিন',
    motherName: 'রহিমা খাতুন',
    dob: new Date('1991-09-30'),
    mobileNumber: '01478901234',
    votingArea: 'ঢাকা-১০',
    address: 'কাজীপাড়া, ঢাকা',
    isRegistered: false
  },
  {
    nid: '3333222211110',
    name: 'শিরিন আক্তার',
    fatherName: 'মোঃ আক্তার হোসেন',
    motherName: 'সাবিনা বেগম',
    dob: new Date('1994-11-12'),
    mobileNumber: '01389012345',
    votingArea: 'ঢাকা-১০',
    address: 'বাড্ডা, ঢাকা',
    isRegistered: false
  },
  {
    nid: '6666555544443',
    name: 'জাহিদ হাসান',
    fatherName: 'মোঃ হাসান মিয়া',
    motherName: 'রেহানা বেগম',
    dob: new Date('1987-04-22'),
    mobileNumber: '01290123456',
    votingArea: 'সিলেট-১',
    address: 'জিন্দাবাজার, সিলেট',
    isRegistered: false
  },
  {
    nid: '2222111100009',
    name: 'তাসলিমা নাসরিন',
    fatherName: 'মোঃ নাসির উদ্দিন',
    motherName: 'তাহমিনা বেগম',
    dob: new Date('1996-06-08'),
    mobileNumber: '01801234567',
    votingArea: 'সিলেট-১',
    address: 'উপশহর, সিলেট',
    isRegistered: false
  }
];

// Sample candidates
const candidatesData = [
  {
    name: 'মোঃ আবদুল্লাহ',
    party: 'জাতীয় নাগরিক পার্টি',
    photo: 'assets/images/Tamim.jpeg',
    symbol: 'assets/images/bodna.jpg',
    area: 'ঢাকা-১০',
    bio: 'অভিজ্ঞ রাজনীতিবিদ এবং সমাজসেবক',
    manifesto: [
      'শিক্ষার মান উন্নয়ন',
      'বেকার যুবকদের কর্মসংস্থান',
      'স্বাস্থ্যসেবা সহজলভ্য করা'
    ],
    socialActivities: ['স্থানীয় স্কুল কমিটি সভাপতি', 'দাতব্য সংস্থা প্রতিষ্ঠাতা'],
    partyHistory: 'জাতীয় নাগরিক পার্টি একটি প্রগতিশীল রাজনৈতিক দল',
    status: 'active',
    phone: '01712345678',
    email: 'abdullah@example.com'
  },
  {
    name: 'সালমা খাতুন',
    party: 'জনকল্যাণ পার্টি',
    photo: 'assets/images/Saima_apu.jpeg',
    symbol: 'assets/images/honey-bee.jpg',
    area: 'ঢাকা-১০',
    bio: 'নারী অধিকার নেত্রী এবং সমাজকর্মী',
    manifesto: [
      'নারীদের জন্য নিরাপদ কর্মপরিবেশ',
      'ক্ষুদ্র শিল্পের বিকাশ',
      'পরিবেশ সংরক্ষণ'
    ],
    socialActivities: ['নারী উন্নয়ন সংস্থা পরিচালক', 'পরিবেশ রক্ষা আন্দোলন সদস্য'],
    partyHistory: 'জনকল্যাণ পার্টি সাধারণ মানুষের কল্যাণে কাজ করে',
    status: 'active',
    phone: '01823456789',
    email: 'salma@example.com'
  },
  {
    name: 'রহিম উদ্দিন',
    party: 'স্বাধীন প্রার্থী',
    photo: 'assets/images/Taz.jpg',
    symbol: 'assets/images/ant.jpg',
    area: 'ঢাকা-১০',
    bio: 'সফল ব্যবসায়ী এবং সমাজসেবক',
    manifesto: [
      'স্থানীয় অবকাঠামো উন্নয়ন',
      'বিশুদ্ধ পানি সরবরাহ',
      'ক্রীড়া ও সংস্কৃতির বিকাশ'
    ],
    socialActivities: ['স্থানীয় বাজার কমিটি সভাপতি', 'এতিমখানা দাতা সদস্য'],
    partyHistory: 'স্বতন্ত্র প্রার্থী হিসেবে জনগণের সরাসরি সমর্থনে বিশ্বাসী',
    status: 'active',
    phone: '01934567890',
    email: 'rahim@example.com'
  }
];

// Admin credentials
const adminData = {
  username: 'admin',
  password: 'admin123', // Will be hashed automatically
  role: 'superadmin'
};

async function seedDatabase() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await CitizenMaster.deleteMany({});
    await Admin.deleteMany({});
    await Candidate.deleteMany({});
    console.log('🗑️  Cleared existing data');

    // Seed CitizenMaster
    await CitizenMaster.insertMany(citizensData);
    console.log(`✅ Seeded ${citizensData.length} citizens`);

    // Seed Admin
    const admin = new Admin(adminData);
    await admin.save();
    console.log('✅ Created admin account');
    console.log('   Username: admin');
    console.log('   Password: admin123');

    // Seed Candidates
    await Candidate.insertMany(candidatesData);
    console.log(`✅ Seeded ${candidatesData.length} candidates`);

    console.log('\n🎉 Database seeding completed successfully!');
    console.log('\n📝 Test Credentials:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('Admin Login:');
    console.log('  Username: admin');
    console.log('  Password: admin123');
    console.log('\nTest Citizen (for registration):');
    console.log('  NID: 1234567890123');
    console.log('  DOB: 1990-01-15');
    console.log('  Mobile: 01712345678');
    console.log('  Area: ঢাকা-১০');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    process.exit(0);

  } catch (error) {
    console.error('❌ Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();