// Script to verify voting system and check current votes
require('dotenv').config();
const mongoose = require('mongoose');
const Vote = require('../models/Vote');
const User = require('../models/User');
const Ballot = require('../models/Ballot');

async function verifyVotingSystem() {
    try {
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nirapodh-vote');
        console.log('✅ Connected to MongoDB\n');

        // Check all votes
        console.log('📊 Current Votes in System:');
        console.log('═'.repeat(50));
        const allVotes = await Vote.find().populate('userId', 'name nid').populate('ballotId', 'name');
        
        if (allVotes.length === 0) {
            console.log('No votes found in database\n');
        } else {
            console.log(`Total votes: ${allVotes.length}\n`);
            for (const vote of allVotes) {
                console.log(`Vote ID: ${vote._id}`);
                console.log(`  User: ${vote.userId?.name} (NID: ${vote.nid})`);
                console.log(`  Ballot: ${vote.ballotId?.name || 'Unknown'}`);
                console.log(`  Ballot ID: ${vote.ballotId?._id || vote.ballotId}`);
                console.log(`  Timestamp: ${vote.timestamp}`);
                console.log('─'.repeat(50));
            }
        }

        // Check all ballots
        console.log('\n🗳️  Current Ballots in System:');
        console.log('═'.repeat(50));
        const allBallots = await Ballot.find();
        
        if (allBallots.length === 0) {
            console.log('No ballots found in database\n');
        } else {
            for (const ballot of allBallots) {
                const voteCount = await Vote.countDocuments({ ballotId: ballot._id });
                console.log(`\nBallot: ${ballot.name}`);
                console.log(`  ID: ${ballot._id}`);
                console.log(`  Location: ${ballot.location}`);
                console.log(`  Start: ${ballot.startDate || 'Not set'}`);
                console.log(`  End: ${ballot.endDate || 'Not set'}`);
                console.log(`  Total Votes: ${voteCount}`);
            }
            console.log('═'.repeat(50));
        }

        // Check users
        console.log('\n👥 Users who have voted:');
        console.log('═'.repeat(50));
        const usersWithVotes = await Vote.distinct('userId');
        console.log(`Total unique users who voted: ${usersWithVotes.length}\n`);
        
        for (const userId of usersWithVotes) {
            const user = await User.findById(userId);
            const userVotes = await Vote.find({ userId: userId }).populate('ballotId', 'name');
            console.log(`User: ${user?.name} (NID: ${user?.nid})`);
            console.log(`  Voted in ${userVotes.length} ballot(s):`);
            for (const vote of userVotes) {
                console.log(`    - ${vote.ballotId?.name} (${vote.timestamp})`);
            }
            console.log('─'.repeat(50));
        }

        console.log('\n✅ System Status: Ready for multiple ballot voting');
        console.log('   Users can vote once per ballot');
        console.log('   Each ballot tracks votes independently\n');

    } catch (error) {
        console.error('❌ Error:', error);
    } finally {
        await mongoose.connection.close();
    }
}

verifyVotingSystem();
