// Citizen Dashboard - Backend Connected Version
// This file shows how to integrate the dashboard with the backend API

document.addEventListener('DOMContentLoaded', async function() {
    // Check if user is logged in
    const token = getAuthToken();
    console.log('🎯 Dashboard loaded, checking auth...');
    console.log('🔑 Token from sessionStorage:', token ? 'EXISTS' : 'NOT FOUND');
    
    if (!token) {
        console.error('❌ No token found, redirecting to login');
        window.location.href = '/login.html';
        return;
    }

    console.log('✅ Token found, loading user data...');
    // Load user data
    await loadUserData();
    
    // Load ballots for user's area
    await loadBallotsForUserArea();
    
    // Load vote status
    await loadVoteStatus();
    
    // Setup event listeners
    setupEventListeners();
});

// Load user data from backend
async function loadUserData() {
    try {
        const token = getAuthToken();
        console.log('🔐 Loading user data, token exists:', !!token);
        
        const response = await apiRequest('GET_USER', 'GET', null, true);
        if (response.success) {
            const user = response.user;
            
            // Update UI with user data
            const userNameElement = document.getElementById('userName');
            if (userNameElement) {
                userNameElement.textContent = user.name || 'ব্যবহারকারী';
            }
            
            const userNidElement = document.getElementById('userNid');
            if (userNidElement) {
                userNidElement.textContent = user.nid;
            }
            
            // Update user area in voting section
            const userAreaElement = document.getElementById('userArea');
            if (userAreaElement) {
                userAreaElement.textContent = user.votingArea || 'N/A';
            }
            
            // Populate profile section
            populateProfileSection(user);
            
            // Store user data
            saveUserData(user);
        }
    } catch (error) {
        console.error('Failed to load user data:', error);
        // Token might be invalid, redirect to login
        logout();
    }
}

// Populate profile section with user data
function populateProfileSection(user) {
    // Get all info-value elements in profile section
    const profileSection = document.getElementById('profile-section');
    if (!profileSection) return;
    
    const infoValues = profileSection.querySelectorAll('.info-value');
    if (infoValues.length >= 4) {
        // Name
        infoValues[0].textContent = user.name || 'N/A';
        
        // NID - convert to Bangla numerals
        infoValues[1].textContent = user.nid ? toBengaliNumber(user.nid) : 'N/A';
        
        // Phone - this might not be in user model, show placeholder
        infoValues[2].textContent = user.phone || 'N/A';
        
        // Voting Area
        infoValues[3].textContent = user.votingArea || 'N/A';
    }
}

// Load ballots for user's voting area
async function loadBallotsForUserArea() {
    try {
        console.log('🔍 Loading ballots for user area...');
        const userData = getUserData();
        console.log('📍 User voting area:', userData?.votingArea);
        
        const token = getAuthToken();
        console.log('🔑 Auth token exists:', !!token);
        console.log('🔑 Token value:', token ? token.substring(0, 20) + '...' : 'null');
        
        const response = await apiRequest('GET_BALLOTS', 'GET', null, true);
        console.log('📦 Ballots API Response:', response);
        
        if (response.success) {
            const ballots = response.ballots;
            console.log('✅ Loaded ballots:', ballots);
            console.log('📊 Number of ballots:', ballots?.length);
            
            // Render ballots in the UI
            await renderBallots(ballots);
        } else {
            console.error('❌ API returned success: false', response);
            throw new Error(response.message || 'Failed to load ballots');
        }
    } catch (error) {
        console.error('❌ Failed to load ballots:', error);
        console.error('Error details:', error.message);
        const container = document.getElementById('ballotsContainer');
        if (container) {
            container.innerHTML = `
                <div class="card" style="text-align: center; padding: 40px;">
                    <p style="color: #666;">আপনার এলাকার জন্য কোনো ব্যালট পাওয়া যায়নি।</p>
                    <p style="color: #999; font-size: 12px; margin-top: 10px;">Error: ${error.message}</p>
                </div>
            `;
        }
    }
}

// Render ballots in the UI
async function renderBallots(ballots) {
    const container = document.getElementById('ballotsContainer');
    if (!container) return;
    
    if (!ballots || ballots.length === 0) {
        container.innerHTML = `
            <div class="card" style="text-align: center; padding: 40px;">
                <p style="color: #666;">আপনার এলাকার জন্য কোনো ব্যালট পাওয়া যায়নি।</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    
    for (const ballot of ballots) {
        const ballotCard = await createBallotCard(ballot);
        container.appendChild(ballotCard);
    }
}

// Create ballot card HTML element
async function createBallotCard(ballot) {
    console.log('🎴 Creating ballot card for:', ballot.name, 'ID:', ballot._id);
    const card = document.createElement('div');
    card.className = 'ballot-card';
    card.dataset.ballotId = ballot._id;
    
    const now = new Date();
    const startDate = ballot.startDate ? new Date(ballot.startDate) : null;
    const endDate = ballot.endDate ? new Date(ballot.endDate) : null;
    
    let status = 'upcoming';
    let statusText = 'শীঘ্রই';
    let statusClass = 'upcoming';
    
    if (startDate && endDate) {
        if (now >= startDate && now <= endDate) {
            status = 'active';
            statusText = 'সক্রিয়';
            statusClass = 'active';
        } else if (now > endDate) {
            status = 'completed';
            statusText = 'সম্পন্ন';
            statusClass = 'completed';
        }
    }
    
    // Check if user has voted for this ballot
    const voteStatus = await checkBallotVoteStatus(ballot._id);
    
    if (voteStatus.hasVoted) {
        // User has already voted - show voted status
        card.classList.add('voted');
        
        const votedTime = new Date(voteStatus.votedAt);
        const timeStr = formatBanglaDateTime(votedTime);
        
        card.innerHTML = `
            <div class="ballot-header">
                <h3>${ballot.name}</h3>
                <span class="ballot-status completed">✓ ভোট প্রদান সম্পন্ন</span>
            </div>
            <div class="voted-message">
                <p>✅ আপনি এই নির্বাচনে ভোট প্রদান করেছেন। ধন্যবাদ!</p>
                <p class="vote-time">ভোট প্রদানের সময়: ${timeStr}</p>
            </div>
        `;
        return card;
    }
    
    // Check if voting period has ended and user hasn't voted
    if (status === 'completed' && !voteStatus.hasVoted) {
        card.classList.add('missed');
        
        const endTimeStr = formatBanglaDateTime(endDate);
        
        card.innerHTML = `
            <div class="ballot-header">
                <h3>${ballot.name}</h3>
                <span class="ballot-status expired">⏱️ ভোটিং সমাপ্ত</span>
            </div>
            <div class="missed-message">
                <p>❌ আপনি এই নির্বাচনে ভোট প্রদান করতে পারেননি। সময় শেষ হয়ে গেছে।</p>
                <p class="vote-time">ভোট প্রদানের সময় শেষ: ${endTimeStr}</p>
            </div>
        `;
        return card;
    }
    
    // Format dates in Bangla
    let dateTimeText = 'তারিখ শীঘ্রই ঘোষণা করা হবে';
    if (startDate && endDate) {
        const startStr = formatBanglaDateTime(startDate);
        const endStr = formatBanglaDateTime(endDate);
        dateTimeText = `⏰ ভোটের সময়: ${startStr} - ${endStr}`;
    }
    
    card.innerHTML = `
        <div class="ballot-header">
            <h3>${ballot.name}</h3>
            <span class="ballot-status ${statusClass}">${statusText}</span>
        </div>
        <div class="ballot-time">
            <p>${dateTimeText}</p>
            ${status === 'active' ? '<p class="time-remaining">⏳ ভোটিং চলছে</p>' : ''}
        </div>
        <div class="candidates-grid" id="candidates-${ballot._id}">
            <div style="text-align: center; padding: 20px;">
                <p>প্রার্থী লোড হচ্ছে...</p>
            </div>
        </div>
        ${status === 'active' ? `
            <button onclick="submitVoteToBallot('${ballot._id}')" class="btn btn-primary btn-large vote-btn">
                ভোট প্রদান করুন
            </button>
        ` : ''}
    `;
    
    console.log('🔄 About to load candidates for ballot:', ballot._id);
    // Load candidates for this ballot
    setTimeout(() => {
        console.log('⏱️ Timeout executing, loading candidates now...');
        loadCandidatesForBallot(ballot._id);
    }, 100);
    
    return card;
}

// Check if user has voted for a ballot
async function checkBallotVoteStatus(ballotId) {
    try {
        const url = `${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.BALLOT_STATUS}/${ballotId}`;
        const token = getAuthToken();
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        return result.success ? result : { hasVoted: false };
    } catch (error) {
        console.error('Failed to check vote status:', error);
        return { hasVoted: false };
    }
}

// Format date and time in Bangla
function formatBanglaDateTime(date) {
    const d = new Date(date);
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear().toString();
    const hours = d.getHours().toString().padStart(2, '0');
    const minutes = d.getMinutes().toString().padStart(2, '0');
    
    const dateStr = `${day}/${month}/${year} ${hours}:${minutes}`;
    return toBengaliNumber(dateStr);
}

// Load candidates for a specific ballot
async function loadCandidatesForBallot(ballotId) {
    try {
        console.log('🎯 Loading candidates for ballot:', ballotId);
        const url = `${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.GET_CANDIDATES}/${ballotId}`;
        console.log('📍 Candidates API URL:', url);
        
        const token = getAuthToken();
        console.log('🔑 Token exists for candidates:', !!token);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('📡 Candidates response status:', response.status);
        const result = await response.json();
        console.log('📦 Candidates response:', result);
        
        if (result.success) {
            console.log('✅ Candidates loaded:', result.candidates?.length, 'candidates');
            renderCandidatesForBallot(ballotId, result.candidates);
        } else {
            console.error('❌ Candidates API failed:', result.message);
            const container = document.getElementById(`candidates-${ballotId}`);
            if (container) {
                container.innerHTML = `<p style="text-align: center; color: #666;">প্রার্থী লোড করতে সমস্যা হয়েছে: ${result.message}</p>`;
            }
        }
    } catch (error) {
        console.error('❌ Failed to load candidates:', error);
        console.error('Error details:', error.message);
        const container = document.getElementById(`candidates-${ballotId}`);
        if (container) {
            container.innerHTML = `<p style="text-align: center; color: #666;">প্রার্থী লোড করতে ব্যর্থ: ${error.message}</p>`;
        }
    }
}

// Render candidates for a ballot
function renderCandidatesForBallot(ballotId, candidates) {
    const container = document.getElementById(`candidates-${ballotId}`);
    if (!container) return;
    
    if (!candidates || candidates.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #666;">এই ব্যালটের জন্য কোনো প্রার্থী পাওয়া যায়নি</p>';
        return;
    }
    
    container.innerHTML = '';
    
    candidates.forEach(candidate => {
        const candidateCard = document.createElement('div');
        candidateCard.className = 'candidate-card';
        candidateCard.innerHTML = `
            <input type="radio" name="vote-${ballotId}" id="candidate-${candidate._id}" value="${candidate._id}">
            <label for="candidate-${candidate._id}" class="candidate-label">
                <img src="${candidate.image || 'assets/images/default-avatar.png'}" alt="${candidate.name}" class="candidate-photo">
                <div class="candidate-info">
                    <h4>${candidate.name}</h4>
                    <p class="party-name">${candidate.party}</p>
                    ${candidate.symbol ? `<img src="${candidate.symbol}" alt="প্রতীক" class="party-symbol">` : ''}
                </div>
            </label>
            <button class="btn btn-sm btn-secondary" onclick="showCandidateDetails('${candidate._id}', '${ballotId}')" style="margin-top: 10px; width: 100%;">বিস্তারিত দেখুন</button>
        `;
        container.appendChild(candidateCard);
    });
}

// Submit vote to a specific ballot
window.submitVoteToBallot = async function(ballotId) {
    const selectedCandidate = document.querySelector(`input[name="vote-${ballotId}"]:checked`);
    
    if (!selectedCandidate) {
        alert('অনুগ্রহ করে একজন প্রার্থী নির্বাচন করুন');
        return;
    }
    
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই প্রার্থীকে ভোট দিতে চান?')) {
        return;
    }
    
    try {
        console.log('📮 Submitting vote for candidate:', selectedCandidate.value, 'ballot:', ballotId);
        const response = await apiRequest('CAST_VOTE', 'POST', {
            candidate: selectedCandidate.value,
            ballotId: ballotId
        }, true);
        
        if (response.success) {
            alert('ভোট সফলভাবে সম্পন্ন হয়েছে! ধন্যবাদ।');
            console.log('✅ Vote submitted successfully');
            
            // Reload ballots to show updated status
            await loadBallotsForUserArea();
            
            // Reload results if on results section
            await loadAllResults();
        }
    } catch (error) {
        console.error('❌ Vote submission failed:', error);
        alert(error.message || 'ভোট দিতে ব্যর্থ হয়েছে');
    }
};

// Load results for all ballots
async function loadAllResults() {
    try {
        console.log('📊 Loading results for all ballots...');
        const response = await apiRequest('GET_BALLOTS', 'GET', null, true);
        
        if (response.success && response.ballots) {
            const resultsContainer = document.querySelector('#results-section .results-container');
            if (!resultsContainer) return;
            
            resultsContainer.innerHTML = '';
            
            for (const ballot of response.ballots) {
                await loadBallotResults(ballot, resultsContainer);
            }
        }
    } catch (error) {
        console.error('❌ Failed to load results:', error);
    }
}

// Load results for a specific ballot
async function loadBallotResults(ballot, container) {
    try {
        const url = `${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.GET_RESULTS}/${ballot._id}`;
        const token = getAuthToken();
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const result = await response.json();
        
        if (result.success) {
            renderBallotResults(ballot, result, container);
        }
    } catch (error) {
        console.error('Failed to load ballot results:', error);
    }
}

// Render ballot results
async function renderBallotResults(ballot, resultData, container) {
    const resultCard = document.createElement('div');
    resultCard.className = 'result-card';
    
    const now = new Date();
    const endDate = ballot.endDate ? new Date(ballot.endDate) : null;
    const isCompleted = endDate && now > endDate;
    
    // Check which candidate user voted for
    const voteStatus = await checkBallotVoteStatus(ballot._id);
    const userVotedCandidateId = voteStatus.hasVoted ? voteStatus.candidate?._id : null;
    
    // For completed elections, show simplified winner card
    if (isCompleted && resultData.results && resultData.results.length > 0 && resultData.totalVotes > 0) {
        resultCard.classList.add('completed-election');
        
        const winner = resultData.results[0];
        
        resultCard.innerHTML = `
            <h3 class="election-title">${ballot.name}</h3>
            <div class="winner-banner">
                🏆 বিজয়ী: ${winner.name} (${winner.party})
            </div>
            <button onclick="downloadResultPDF('${ballot._id}', '${ballot.name}')" class="btn-download-pdf">
                PDF ডাউনলোড করুন
            </button>
        `;
        
        container.appendChild(resultCard);
        return;
    }
    
    // For live/ongoing elections, show detailed results
    let statusHtml = '<p class="result-status live">⚪ লাইভ ফলাফল</p>';
    if (isCompleted) {
        resultCard.classList.add('completed');
        statusHtml = '';
    }
    
    let resultsHtml = '';
    
    if (resultData.results && resultData.results.length > 0) {
        resultData.results.forEach((candidate, index) => {
            const percentage = resultData.totalVotes > 0 
                ? ((candidate.voteCount / resultData.totalVotes) * 100).toFixed(1)
                : 0;
            
            const isWinner = index === 0 && isCompleted && candidate.voteCount > 0;
            const isUserVote = userVotedCandidateId && candidate.candidateId === userVotedCandidateId;
            
            resultsHtml += `
                <div class="result-item ${isWinner ? 'winner' : ''} ${isUserVote ? 'user-voted' : ''}">
                    <div class="result-info">
                        ${candidate.image ? `<img src="${candidate.image}" alt="${candidate.name}" class="candidate-photo-small" style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover; margin-right: 12px;">` : ''}
                        <div>
                            <h4>${candidate.name} ${isUserVote ? '<span class="user-vote-badge">✓ আপনার ভোট</span>' : ''}</h4>
                            <p>${candidate.party}</p>
                        </div>
                    </div>
                    <div class="result-stats">
                        <span class="vote-count">${toBengaliNumber(candidate.voteCount)} ভোট</span>
                        <span class="vote-percentage">${toBengaliNumber(percentage)}%</span>
                    </div>
                    <div class="progress-bar">
                        <div class="progress-fill" style="width: ${percentage}%"></div>
                    </div>
                </div>
            `;
        });
    } else {
        resultsHtml = '<p style="text-align: center; color: #666; padding: 20px;">এখনও কোনো ভোট পড়েনি</p>';
    }
    
    resultCard.innerHTML = `
        <h3>${ballot.name}</h3>
        ${statusHtml}
        ${resultsHtml}
        <div class="total-votes">
            মোট ভোট: <strong>${toBengaliNumber(resultData.totalVotes)}</strong>
        </div>
    `;
    
    container.appendChild(resultCard);
}

// Show candidate details (placeholder)
window.showCandidateDetails = function(candidateId, ballotId) {
    console.log('Show details for candidate:', candidateId, 'in ballot:', ballotId);
    // TODO: Implement modal with full candidate details
    alert('প্রার্থীর বিস্তারিত তথ্য শীঘ্রই যুক্ত করা হবে');
}

// Download result PDF
window.downloadResultPDF = async function(ballotId, ballotName) {
    try {
        console.log('Downloading PDF for ballot:', ballotId);
        
        // Get ballot results
        const url = `${API_CONFIG.API_URL}${API_CONFIG.ENDPOINTS.GET_RESULTS}/${ballotId}`;
        const token = getAuthToken();
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        const resultData = await response.json();
        
        if (!resultData.success) {
            alert('ফলাফল লোড করতে ব্যর্থ হয়েছে');
            return;
        }
        
        // Initialize jsPDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        
        // Colors
        const primaryGreen = [34, 139, 34];
        const lightGreen = [248, 250, 248];
        const darkGray = [80, 80, 80];
        const lightGray = [200, 200, 200];
        
        // Header Background
        doc.setFillColor(lightGreen[0], lightGreen[1], lightGreen[2]);
        doc.rect(0, 0, pageWidth, 50, 'F');
        
        // Green stripe at top
        doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.rect(0, 0, pageWidth, 3, 'F');
        
        // Title
        doc.setFontSize(22);
        doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Bangladesh Election Commission', pageWidth / 2, 20, { align: 'center' });
        
        doc.setFontSize(14);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text('Nirapodh Vote - Secure Electronic Voting System', pageWidth / 2, 30, { align: 'center' });
        
        // Decorative line
        doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.setLineWidth(1);
        doc.line(20, 40, pageWidth - 20, 40);
        
        doc.setFontSize(10);
        doc.setTextColor(100, 100, 100);
        doc.text('Official Document', pageWidth / 2, 46, { align: 'center' });
        
        let yPos = 65;
        
        // Election Results Title
        doc.setFontSize(20);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text('Election Results Report', pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 10;
        doc.setFontSize(14);
        doc.setFont('helvetica', 'normal');
        // Convert ballot name to English format
        const englishBallotName = ballotName.includes('জাতীয়') ? 'National Parliament Election 2025' : 
                                   ballotName.includes('মেয়র') ? 'Mayoral Election 2025' :
                                   'Dhaka-1 Constituency Election';
        doc.text(englishBallotName, pageWidth / 2, yPos, { align: 'center' });
        
        yPos += 5;
        doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
        doc.setLineWidth(0.5);
        doc.line(20, yPos, pageWidth - 20, yPos);
        
        yPos += 10;
        
        // Election Summary Box
        doc.setFontSize(13);
        doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Election Summary', 20, yPos);
        
        yPos += 5;
        
        // Summary Box
        doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.setLineWidth(0.5);
        doc.rect(20, yPos, pageWidth - 40, 28);
        
        yPos += 8;
        
        // Summary Details
        doc.setFontSize(11);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text('Total Votes Cast:', 25, yPos);
        doc.setFont('helvetica', 'bold');
        doc.text(resultData.totalVotes.toString(), 85, yPos);
        
        doc.setFont('helvetica', 'normal');
        doc.text('Date & Time:', 110, yPos);
        doc.setFont('helvetica', 'bold');
        const now = new Date();
        doc.text(now.toLocaleString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric', 
            hour: '2-digit', 
            minute: '2-digit' 
        }), 110, yPos + 7);
        
        yPos += 25;
        
        // Candidate Results
        doc.setFontSize(13);
        doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Candidate Results', 20, yPos);
        
        yPos += 5;
        
        // Table Header
        doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.rect(20, yPos, pageWidth - 40, 10, 'F');
        
        doc.setFontSize(10);
        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.text('Rank', 25, yPos + 7);
        doc.text('Candidate Name', 45, yPos + 7);
        doc.text('Party', 95, yPos + 7);
        doc.text('Votes', 135, yPos + 7);
        doc.text('Percentage', 160, yPos + 7);
        
        yPos += 10;
        
        // Table Rows
        if (resultData.results && resultData.results.length > 0) {
            resultData.results.forEach((candidate, index) => {
                const percentage = resultData.totalVotes > 0 
                    ? ((candidate.voteCount / resultData.totalVotes) * 100).toFixed(2)
                    : 0;
                
                // Alternate row colors
                if (index === 0) {
                    doc.setFillColor(232, 245, 233);
                    doc.rect(20, yPos, pageWidth - 40, 10, 'F');
                }
                
                doc.setTextColor(0, 0, 0);
                doc.setFont('helvetica', index === 0 ? 'bold' : 'normal');
                doc.setFontSize(10);
                
                doc.text((index + 1).toString(), 25, yPos + 7);
                doc.text(candidate.name, 45, yPos + 7);
                doc.text(candidate.party, 95, yPos + 7);
                doc.text(candidate.voteCount.toString(), 135, yPos + 7);
                doc.text(percentage + '%', 160, yPos + 7);
                
                // Winner badge
                if (index === 0) {
                    doc.setFillColor(46, 204, 113);
                    doc.roundedRect(180, yPos + 1, 10, 6, 2, 2, 'F');
                    doc.setTextColor(255, 255, 255);
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'bold');
                    doc.text('W', 185, yPos + 5.5, { align: 'center' });
                }
                
                yPos += 10;
                
                // Draw line separator
                doc.setDrawColor(lightGray[0], lightGray[1], lightGray[2]);
                doc.setLineWidth(0.3);
                doc.line(20, yPos, pageWidth - 20, yPos);
            });
        }
        
        yPos += 10;
        
        // Winner Box
        if (resultData.results && resultData.results.length > 0) {
            const winner = resultData.results[0];
            const winnerPercentage = resultData.totalVotes > 0 
                ? ((winner.voteCount / resultData.totalVotes) * 100).toFixed(2)
                : 0;
            
            doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
            doc.setFillColor(240, 253, 244);
            doc.setLineWidth(1.5);
            doc.roundedRect(20, yPos, pageWidth - 40, 35, 3, 3, 'FD');
            
            yPos += 10;
            
            doc.setFontSize(11);
            doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
            doc.setFont('helvetica', 'bold');
            doc.text('OFFICIAL WINNER', 25, yPos);
            
            yPos += 10;
            
            doc.setFontSize(16);
            doc.setTextColor(0, 0, 0);
            doc.text(winner.name, 25, yPos);
            
            yPos += 7;
            
            doc.setFontSize(10);
            doc.setTextColor(80, 80, 80);
            doc.setFont('helvetica', 'normal');
            doc.text(`${winner.party} | Votes: ${winner.voteCount} (${winnerPercentage}%)`, 25, yPos);
            
            yPos += 15;
        }
        
        // Verification Details
        doc.setFontSize(10);
        doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.setFont('helvetica', 'bold');
        doc.text('Verification Details', 20, yPos);
        
        yPos += 7;
        
        doc.setFontSize(9);
        doc.setTextColor(80, 80, 80);
        doc.setFont('helvetica', 'normal');
        doc.text(`Document ID: BEC-${Date.now().toString().slice(-8)}`, 20, yPos);
        
        yPos += 7;
        doc.text('Generated By: Bangladesh Election Commission', 20, yPos);
        
        yPos += 7;
        doc.text('Verification Portal: https://nirapodh-vote.gov.bd/verify', 20, yPos);
        
        // Footer
        doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
        doc.rect(0, pageHeight - 12, pageWidth, 3, 'F');
        
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text('This is an official election result document generated by NirapodhVote System.', pageWidth / 2, pageHeight - 20, { align: 'center' });
        doc.text('© 2026 Bangladesh Election Commission. All rights reserved.', pageWidth / 2, pageHeight - 15, { align: 'center' });
        
        // Save PDF
        doc.save(`election-results-${Date.now()}.pdf`);
        
        // Show success message
        showNotification('ফলাফল সফলভাবে ডাউনলোড হয়েছে', 'success');
        
    } catch (error) {
        console.error('Failed to download PDF:', error);
        alert('ডাউনলোড করতে ব্যর্থ হয়েছে');
    }
}

// Helper function to show notifications
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'success' ? '#10b981' : '#3b82f6'};
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
    `;
    
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

// Load vote status from backend
async function loadVoteStatus() {
    try {
        const response = await apiRequest('VOTE_STATUS', 'GET', null, true);
        if (response.success) {
            const hasVoted = response.hasVoted;
            
            // Update vote UI based on status
            updateVoteUI(hasVoted);
            
            if (hasVoted) {
                // Load statistics if user has voted
                await loadVoteStatistics();
            }
        }
    } catch (error) {
        console.error('Failed to load vote status:', error);
    }
}

// Load vote statistics from backend
async function loadVoteStatistics() {
    try {
        const response = await apiRequest('VOTE_STATISTICS', 'GET', null, false);
        if (response.success) {
            const stats = response.statistics;
            
            // Update statistics UI
            updateStatisticsUI(stats);
        }
    } catch (error) {
        console.error('Failed to load statistics:', error);
    }
}

// Cast vote via backend
async function castVote(candidate) {
    // Show confirmation
    if (!confirm('আপনি কি নিশ্চিত যে আপনি এই প্রার্থীকে ভোট দিতে চান?')) {
        return;
    }
    
    try {
        showLoadingState();
        
        const response = await apiRequest('CAST_VOTE', 'POST', {
            candidate: candidate
        }, true);
        
        if (response.success) {
            hideLoadingState();
            showAlert('ভোট সফলভাবে সম্পন্ন হয়েছে!', 'success');
            
            // Reload page to show updated status
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        }
    } catch (error) {
        hideLoadingState();
        showAlert(error.message || 'ভোট দিতে ব্যর্থ হয়েছে', 'error');
    }
}

// Setup event listeners
function setupEventListeners() {
    // Vote buttons
    const voteButtons = document.querySelectorAll('.vote-btn');
    voteButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            const candidate = this.dataset.candidate;
            castVote(candidate);
        });
    });
    
    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', function(e) {
            e.preventDefault();
            logout();
        });
    }
}

// Update vote UI based on vote status
function updateVoteUI(hasVoted) {
    const voteSection = document.getElementById('voteSection');
    const votedSection = document.getElementById('votedSection');
    
    if (hasVoted) {
        if (voteSection) voteSection.style.display = 'none';
        if (votedSection) votedSection.style.display = 'block';
    } else {
        if (voteSection) voteSection.style.display = 'block';
        if (votedSection) votedSection.style.display = 'none';
    }
}

// Update statistics UI
function updateStatisticsUI(stats) {
    // Update total votes
    const totalVotesElement = document.getElementById('totalVotes');
    if (totalVotesElement) {
        totalVotesElement.textContent = stats.total || 0;
    }
    
    // Update individual candidate votes
    updateCandidateVotes('candidateA', stats.candidateA || 0, stats.total);
    updateCandidateVotes('candidateB', stats.candidateB || 0, stats.total);
    updateCandidateVotes('candidateC', stats.candidateC || 0, stats.total);
    updateCandidateVotes('candidateD', stats.candidateD || 0, stats.total);
}

// Update candidate vote count and percentage
function updateCandidateVotes(candidateId, votes, total) {
    const voteCountElement = document.getElementById(`${candidateId}Votes`);
    const votePercentElement = document.getElementById(`${candidateId}Percent`);
    const progressBarElement = document.getElementById(`${candidateId}Progress`);
    
    if (voteCountElement) {
        voteCountElement.textContent = votes;
    }
    
    const percentage = total > 0 ? ((votes / total) * 100).toFixed(1) : 0;
    
    if (votePercentElement) {
        votePercentElement.textContent = `${percentage}%`;
    }
    
    if (progressBarElement) {
        progressBarElement.style.width = `${percentage}%`;
    }
}

// Show loading state
function showLoadingState() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'flex';
    }
}

// Hide loading state
function hideLoadingState() {
    const loadingOverlay = document.getElementById('loadingOverlay');
    if (loadingOverlay) {
        loadingOverlay.style.display = 'none';
    }
}

// Show alert message
function showAlert(message, type = 'info') {
    // Use your existing alert system
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alert(message);
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    let iconClass = '';
    let title = '';
    switch(type) {
        case 'success': 
            iconClass = 'fa-circle-check'; 
            title = '✓ সফল'; 
            break;
        case 'error': 
            iconClass = 'fa-circle-xmark'; 
            title = '✗ ত্রুটি'; 
            break;
    }

    alertDiv.innerHTML = `
        <div class="alert-icon">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="alert-content">
            <div class="alert-title">${title}</div>
            <div class="alert-message">${message}</div>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}
