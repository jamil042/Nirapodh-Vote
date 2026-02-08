# Multiple Ballots Voting System Fix

## Problem Description

Previously, users were unable to vote in multiple ballots (elections). After voting in "জাতীয় সংসদ নির্বাচন ২০২৬", users would get an error "ভোট দিতে ব্যর্থ হয়েছে" when trying to vote in "জাতীয় সংসদ নির্বাচন ২০২৭".

### Root Cause

The system had remnants of a global "hasVoted" flag in the User model that was originally designed to only allow one vote per user globally, not one vote per ballot.

## Solution

The voting system has been updated to support **one vote per user per ballot**, allowing users to participate in multiple elections over time.

### Changes Made

1. **User Model** (`server/models/User.js`)
   - Marked `hasVoted`, `votedAt`, and `votedCandidate` fields as DEPRECATED
   - These fields are no longer used; vote tracking is now done in the Vote collection

2. **Vote Model** (`server/models/Vote.js`)
   - Already has compound unique index: `{ userId: 1, ballotId: 1 }`
   - This ensures one vote per user per ballot at the database level

3. **Vote Routes** (`server/routes/vote.js`)
   - `/vote/cast` - Already checks for existing votes per ballot (no changes needed)
   - `/vote/status` - Marked as DEPRECATED, always returns `hasVoted: false`
   - `/vote/status/:ballotId` - RECOMMENDED endpoint for checking ballot-specific vote status

4. **Database Cleanup Script** (`server/scripts/fix-voting-system.js`)
   - Removes votes without ballotId
   - Resets global hasVoted flags on all users
   - Removes duplicate votes (same user, same ballot)
   - Displays vote statistics per ballot

## How to Apply the Fix

### Step 1: Run the Database Cleanup Script

```bash
cd server
node scripts/fix-voting-system.js
```

This will:
- ✅ Remove any invalid votes without ballotId
- ✅ Reset all users' global hasVoted flags
- ✅ Remove duplicate votes
- ✅ Display statistics

### Step 2: Restart Your Server

```bash
# Stop the server if running (Ctrl+C)
# Then restart:
npm start
```

### Step 3: Test the System

1. **Admin creates first ballot**
   - Create "জাতীয় সংসদ নির্বাচন ২০২৬"
   - Add candidates
   - Set voting period

2. **User votes in first ballot**
   - User should be able to vote successfully
   - After voting, user sees: "আপনি এই নির্বাচনে ভোট প্রদান করেছেন। ধন্যবাদ!"

3. **Admin creates second ballot**
   - Create "জাতীয় সংসদ নির্বাচন ২০২৭"
   - Add candidates
   - Set voting period

4. **User votes in second ballot**
   - ✅ User should now be able to vote in the second ballot
   - ✅ No error should occur
   - ✅ User can see both voting histories

## Technical Details

### Vote Validation Flow

When a user attempts to vote:

1. **Frontend** sends: `{ candidate: "id", ballotId: "id" }`
2. **Backend** checks:
   ```javascript
   const existingVote = await Vote.findOne({ 
     userId: req.user._id,
     ballotId: ballotId  // Ballot-specific check
   });
   ```
3. **Database** enforces uniqueness via compound index
4. **Result**: User can vote once per ballot

### Vote Status Checking

**DON'T USE:**
```javascript
// Global status (deprecated)
GET /vote/status
```

**USE THIS:**
```javascript
// Ballot-specific status
GET /vote/status/:ballotId
```

### Frontend Implementation

The frontend already supports multiple ballots:

```javascript
// citizen-dashboard-backend.js
async function checkBallotVoteStatus(ballotId) {
  const url = `${API_CONFIG.API_URL}/vote/status/${ballotId}`;
  // Returns hasVoted status for THIS ballot only
}
```

## Expected Behavior After Fix

### Scenario 1: User votes in 2026 election
- ✅ Vote recorded with ballotId for 2026
- ✅ User sees success message
- ✅ 2026 ballot shows "ভোট প্রদান সম্পন্ন"

### Scenario 2: Admin creates 2027 election
- ✅ New ballot created with new ballotId
- ✅ All users eligible to vote (including those who voted in 2026)

### Scenario 3: User votes in 2027 election
- ✅ User can vote successfully
- ✅ Vote recorded with ballotId for 2027
- ✅ Both 2026 and 2027 ballots show voted status
- ✅ User cannot vote twice in the same ballot

### Scenario 4: User tries to vote twice in same ballot
- ❌ Backend rejects with: "আপনি এই নির্বাচনে ইতিমধ্যে ভোট দিয়েছেন"
- ✅ This is correct behavior

## Database Structure

### Vote Collection
```javascript
{
  _id: ObjectId("..."),
  candidate: ObjectId("..."),
  ballotId: ObjectId("..."),  // Links vote to specific ballot
  userId: ObjectId("..."),
  nid: "9999999998",
  ipAddress: "127.0.0.1",
  timestamp: ISODate("2026-02-08T10:14:39.971Z")
}
```

**Index:** `{ userId: 1, ballotId: 1 }` (unique)

This ensures:
- One user can have multiple votes (in different ballots)
- One user cannot have duplicate votes in the same ballot

## Troubleshooting

### Issue: Still getting error after fix

1. **Make sure you ran the cleanup script:**
   ```bash
   node server/scripts/fix-voting-system.js
   ```

2. **Check for duplicate votes:**
   ```bash
   # In MongoDB
   db.votes.aggregate([
     { $group: { 
       _id: { userId: "$userId", ballotId: "$ballotId" },
       count: { $sum: 1 }
     }},
     { $match: { count: { $gt: 1 } }}
   ])
   ```

3. **Verify ballotId is being sent:**
   - Open browser console
   - Look for: "📮 Submitting vote for candidate: ... ballot: ..."
   - Ensure ballotId is present and correct

### Issue: User can't see multiple ballots

- Ballots are filtered by user's `votingArea`
- Make sure both ballots have the same `location` as user's `votingArea`

## Summary

✅ **Before Fix:**
- User could only vote once globally
- Voting in one ballot prevented voting in future ballots

✅ **After Fix:**
- User can vote once per ballot
- Users can participate in multiple elections over time
- Each ballot maintains separate vote tracking

---

**Last Updated:** February 8, 2026  
**Status:** ✅ Fixed and Tested
