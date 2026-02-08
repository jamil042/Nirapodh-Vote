// Script to fix vote collection indexes
require('dotenv').config();
const mongoose = require('mongoose');

async function fixVoteIndexes() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/nirapodh-vote');
        console.log('✅ Connected to MongoDB\n');

        const db = mongoose.connection.db;
        const votesCollection = db.collection('votes');

        // Check existing indexes
        console.log('📋 Current indexes on votes collection:');
        console.log('═'.repeat(60));
        const indexes = await votesCollection.indexes();
        
        for (const index of indexes) {
            console.log(`Index: ${index.name}`);
            console.log(`  Keys:`, JSON.stringify(index.key));
            console.log(`  Unique: ${index.unique || false}`);
            console.log('─'.repeat(60));
        }

        // Drop the old userId_1 index if it exists
        const hasOldIndex = indexes.some(idx => idx.name === 'userId_1');
        
        if (hasOldIndex) {
            console.log('\n🔨 Dropping old userId_1 index...');
            await votesCollection.dropIndex('userId_1');
            console.log('✅ Old index dropped successfully!');
        } else {
            console.log('\n✅ No old userId_1 index found (already clean)');
        }

        // Ensure the correct compound index exists
        console.log('\n🔨 Creating/verifying compound index { userId: 1, ballotId: 1 }...');
        try {
            await votesCollection.createIndex(
                { userId: 1, ballotId: 1 }, 
                { unique: true, name: 'userId_1_ballotId_1' }
            );
            console.log('✅ Compound index created/verified successfully!');
        } catch (error) {
            if (error.code === 85) {
                console.log('✅ Compound index already exists!');
            } else {
                throw error;
            }
        }

        // Show final indexes
        console.log('\n📋 Final indexes on votes collection:');
        console.log('═'.repeat(60));
        const finalIndexes = await votesCollection.indexes();
        
        for (const index of finalIndexes) {
            console.log(`Index: ${index.name}`);
            console.log(`  Keys:`, JSON.stringify(index.key));
            console.log(`  Unique: ${index.unique || false}`);
            console.log('─'.repeat(60));
        }

        console.log('\n✅ Vote indexes fixed successfully!');
        console.log('\n📝 Summary:');
        console.log('  - Removed old userId_1 unique index (if existed)');
        console.log('  - Ensured compound index { userId: 1, ballotId: 1 } exists');
        console.log('  - Users can now vote once per ballot');
        console.log('\n⚠️  IMPORTANT: Restart your server (node server.js) for changes to take effect!');

    } catch (error) {
        console.error('❌ Error fixing indexes:', error);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Disconnected from MongoDB');
    }
}

fixVoteIndexes();
