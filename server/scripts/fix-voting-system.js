// Script to fix voting system for multiple ballots
require('dotenv').config();
const mongoose = require('mongoose');
const Vote = require('../models/Vote');
const User = require('../models/User');

async function fixVotingSystem() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nirapodh-vote');
        console.log('✅ Connected to MongoDB');

        // 1. Check for votes without ballotId
        const votesWithoutBallot = await Vote.find({ ballotId: { $exists: false } });
        console.log(`\n📊 Found ${votesWithoutBallot.length} votes without ballotId`);
        
        if (votesWithoutBallot.length > 0) {
            console.log('⚠️  These votes need to be deleted or assigned to a ballot');
            console.log('❌ Deleting votes without ballotId...');
            const deleteResult = await Vote.deleteMany({ ballotId: { $exists: false } });
            console.log(`✅ Deleted ${deleteResult.deletedCount} invalid votes`);
        }

        // 2. Reset all users' hasVoted flags (since these are now ballot-specific)
        console.log('\n🔄 Resetting global hasVoted flags on User model...');
        const updateResult = await User.updateMany(
            { hasVoted: true },
            { 
                $set: { 
                    hasVoted: false,
                    votedAt: null,
                    votedCandidate: null
                }
            }
        );
        console.log(`✅ Reset hasVoted flag for ${updateResult.modifiedCount} users`);

        // 3. Show vote statistics per ballot
        console.log('\n📈 Vote Statistics by Ballot:');
        const voteStats = await Vote.aggregate([
            {
                $group: {
                    _id: '$ballotId',
                    voteCount: { $sum: 1 },
                    uniqueUsers: { $addToSet: '$userId' }
                }
            },
            {
                $project: {
                    _id: 1,
                    voteCount: 1,
                    uniqueUserCount: { $size: '$uniqueUsers' }
                }
            }
        ]);

        for (const stat of voteStats) {
            const Ballot = require('../models/Ballot');
            const ballot = await Ballot.findById(stat._id);
            console.log(`\nBallot: ${ballot ? ballot.name : 'Unknown'}`);
            console.log(`  ID: ${stat._id}`);
            console.log(`  Total votes: ${stat.voteCount}`);
            console.log(`  Unique users: ${stat.uniqueUserCount}`);
        }

        // 4. Check for duplicate votes (same user, same ballot)
        console.log('\n🔍 Checking for duplicate votes...');
        const duplicates = await Vote.aggregate([
            {
                $group: {
                    _id: { userId: '$userId', ballotId: '$ballotId' },
                    count: { $sum: 1 },
                    voteIds: { $push: '$_id' }
                }
            },
            {
                $match: { count: { $gt: 1 } }
            }
        ]);

        if (duplicates.length > 0) {
            console.log(`⚠️  Found ${duplicates.length} duplicate vote records`);
            for (const dup of duplicates) {
                // Keep the first vote, remove others
                const voteIdsToDelete = dup.voteIds.slice(1);
                console.log(`  Removing ${voteIdsToDelete.length} duplicate votes for user ${dup._id.userId}`);
                await Vote.deleteMany({ _id: { $in: voteIdsToDelete } });
            }
            console.log('✅ Removed all duplicates');
        } else {
            console.log('✅ No duplicate votes found');
        }

        console.log('\n✅ Voting system fixed successfully!');
        console.log('\n📝 Summary:');
        console.log('  - Removed votes without ballotId');
        console.log('  - Reset global hasVoted flags on users');
        console.log('  - Removed duplicate votes');
        console.log('  - Users can now vote once per ballot');

    } catch (error) {
        console.error('❌ Error fixing voting system:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

fixVotingSystem();
