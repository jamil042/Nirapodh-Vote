// Admin Backend Data Functions - All data fetched from backend/database

// ===== DASHBOARD FUNCTIONS =====

// Load Dashboard Statistics from backend
async function loadDashboardData() {
    console.log('🔄 Loading dashboard data...');
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        console.log('❌ No token found');
        return;
    }

    console.log('✅ Token found, fetching statistics...');

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/statistics`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response status:', response.status);
        
        const data = await response.json();
        console.log('📊 Dashboard data received:', data);

        if (data.success) {
            const stats = data.statistics;
            console.log('📈 Statistics:', stats);

            // Update stat cards with Bengali numbers
            const totalBallots = document.getElementById('total-ballots');
            const activeVotes = document.getElementById('active-votes');
            const totalVoters = document.getElementById('total-voters');
            const votesCast = document.getElementById('votes-cast');

            if (totalBallots) {
                totalBallots.textContent = toBengaliNumber(stats.totalBallots || 0);
                console.log('✅ Total ballots updated:', stats.totalBallots);
            }
            if (activeVotes) {
                activeVotes.textContent = toBengaliNumber(stats.totalVotes || 0);
                console.log('✅ Active votes updated:', stats.totalVotes);
            }
            if (totalVoters) {
                totalVoters.textContent = toBengaliNumber(stats.totalUsers || 0);
                console.log('✅ Total voters updated:', stats.totalUsers);
            }
            if (votesCast) {
                votesCast.textContent = toBengaliNumber(stats.votersWhoVoted || 0);
                console.log('✅ Votes cast updated:', stats.votersWhoVoted);
            }

            // Load activity list with real data
            const activityListContainer = document.getElementById('activity-list-container');
            if (activityListContainer) {
                activityListContainer.innerHTML = `
                    <div class="activity-item">
                        <span class="activity-time">এখন</span>
                        <p class="activity-text">মোট ${toBengaliNumber(stats.totalUsers)} জন নিবন্ধিত ভোটার</p>
                    </div>
                    <div class="activity-item">
                        <span class="activity-time">আজ</span>
                        <p class="activity-text">${toBengaliNumber(stats.votersWhoVoted)} জন ভোট প্রদান করেছেন</p>
                    </div>
                    <div class="activity-item">
                        <span class="activity-time">পরিসংখ্যান</span>
                        <p class="activity-text">টার্নআউট: ${toBengaliNumber(stats.turnoutPercentage)}%</p>
                    </div>
                `;
                console.log('✅ Activity list updated');
            }

            // Load live voting statistics
            const liveStatsContainer = document.getElementById('live-stats-container');
            if (liveStatsContainer) {
                try {
                    const ballotsRes = await fetch(`${API_CONFIG.API_URL}/admin/ballots`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    const ballotsData = await ballotsRes.json();

                    if (ballotsData.success && ballotsData.ballots && ballotsData.ballots.length > 0) {
                        const ballotStats = [];
                        for (const ballot of ballotsData.ballots) {
                            let voteCount = 0;
                            const totalEligible = stats.totalUsers || 1;
                            try {
                                const resResult = await fetch(`${API_CONFIG.API_URL}/admin/results/${ballot._id}`, {
                                    headers: { 'Authorization': `Bearer ${token}` }
                                });
                                const resData = await resResult.json();
                                if (resData.success) {
                                    voteCount = resData.totalVotes || 0;
                                }
                            } catch (e) {
                                console.warn('Could not fetch results for ballot:', ballot._id);
                            }
                            const percentage = totalEligible > 0 ? Math.round((voteCount / totalEligible) * 100) : 0;
                            ballotStats.push({ ballot, voteCount, percentage });
                        }

                        const itemsHtml = ballotStats.map(({ ballot, voteCount, percentage }) => {
                            const getTurnoutClass = (p) => p >= 50 ? 'high' : p >= 20 ? 'mid' : 'low';
                            return `
                            <div class="live-ballot-card">
                                <div class="live-ballot-header">
                                    <div class="live-ballot-info">
                                        <div class="live-status-dot"></div>
                                        <div>
                                            <div class="live-ballot-name">${ballot.name}</div>
                                            <div class="live-ballot-location"><svg viewBox="0 0 24 24" fill="currentColor" width="12" height="12"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> ${ballot.location}</div>
                                        </div>
                                    </div>
                                    <div class="live-vote-display">
                                        <div class="live-vote-count">${toBengaliNumber(voteCount)}</div>
                                        <div class="live-vote-label">ভোট</div>
                                    </div>
                                </div>
                                <div class="live-progress-container">
                                    <div class="live-progress-bar" data-progress="${percentage}"></div>
                                </div>
                                <div class="live-ballot-footer">
                                    <span class="live-turnout-label">টার্নআউট</span>
                                    <span class="live-turnout-badge ${getTurnoutClass(percentage)}">${toBengaliNumber(percentage)}%</span>
                                </div>
                            </div>`;
                        }).join('');

                        liveStatsContainer.innerHTML = itemsHtml;

                        // Animate progress bars
                        setTimeout(() => {
                            document.querySelectorAll('.live-progress-bar').forEach(bar => {
                                const progress = bar.getAttribute('data-progress');
                                bar.style.width = progress + '%';
                            });
                        }, 150);

                        console.log('✅ Live stats updated with', ballotStats.length, 'ballots');
                    } else {
                        liveStatsContainer.innerHTML = '<div class="live-stats-empty"><svg viewBox="0 0 24 24" fill="#ccc" width="48" height="48"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-9 14l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg><p>এখনো কোনো ব্যালট তৈরি হয়নি</p></div>';
                    }
                } catch (liveErr) {
                    console.error('❌ Live stats load error:', liveErr);
                    liveStatsContainer.innerHTML = '<div class="live-stats-empty"><p style="color:#f44336;">লাইভ পরিসংখ্যান লোড ব্যর্থ</p></div>';
                }
            }
            
            console.log('✅ Dashboard loaded successfully!');
        } else {
            console.error('❌ API returned success: false', data);
        }
    } catch (error) {
        console.error('❌ Load dashboard data error:', error);
    }
}

// ===== CANDIDATES FUNCTIONS =====

// Load candidates from backend
async function loadCandidatesData() {
    const candidatesTableBody = document.getElementById('candidatesTableBody');
    if (!candidatesTableBody) return;

    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        candidatesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">অনুমোদন প্রয়োজন</td></tr>';
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.success && data.candidates && data.candidates.length > 0) {
            candidatesTableBody.innerHTML = data.candidates.map(candidate => {
                const statusBadge = candidate.status === 'active'
                    ? '<span class="badge badge-success">সক্রিয়</span>'
                    : '<span class="badge badge-danger">নিষ্ক্রিয়</span>';

                const imageSrc = candidate.image || 'assets/images/default-avatar.png';

                let symbolHtml = '';
                if (candidate.symbol && candidate.symbol.startsWith('data:')) {
                    symbolHtml = `<img src="${candidate.symbol}" alt="Party Symbol" style="width: 40px; height: 40px; object-fit: contain;">`;
                } else if (candidate.symbol) {
                    symbolHtml = `<img src="${candidate.symbol}" alt="Party Symbol" style="width: 40px; height: 40px; object-fit: contain;" onerror="this.src='assets/images/powerful-symbol-unity-anti-corruption-day_968957-12635.avif'">`;
                } else {
                    symbolHtml = '<span style="font-size: 12px; color: #999;">নেই</span>';
                }

                return `
                    <tr>
                        <td>
                            <div class="candidate-photo">
                                <img src="${imageSrc}" alt="${candidate.name}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 50%;" onerror="this.src='assets/images/default-avatar.png'">
                            </div>
                        </td>
                        <td>${candidate.name}</td>
                        <td>${candidate.party}</td>
                        <td>
                            <div class="party-symbol">
                                ${symbolHtml}
                            </div>
                        </td>
                        <td>${candidate.area}</td>
                        <td>${statusBadge}</td>
                        <td>
                            <button class="btn-icon" onclick="viewCandidateDetails('${candidate._id}')" title="বিস্তারিত দেখুন">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                                </svg>
                            </button>
                            <button class="btn-icon" onclick="deleteCandidateFromDB('${candidate._id}')">
                                <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                    <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                                </svg>
                            </button>
                        </td>
                    </tr>
                `;
            }).join('');
        } else {
            candidatesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #999;">কোনো প্রার্থী নেই</td></tr>';
        }
    } catch (error) {
        console.error('Load candidates error:', error);
        candidatesTableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #f44336;">প্রার্থী তালিকা লোড করতে ব্যর্থ হয়েছে</td></tr>';
    }
}

// ===== COMPLAINTS FUNCTIONS =====

// Load complaints from backend
async function loadComplaintsData() {
    const complaintsListContainer = document.getElementById('complaints-list-container');
    if (!complaintsListContainer) return;

    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        complaintsListContainer.innerHTML = '<p style="text-align: center; color: #999;">অনুমোদন প্রয়োজন</p>';
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/complaint/admin/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.success && data.complaints && data.complaints.length > 0) {
            complaintsListContainer.innerHTML = data.complaints.map(complaint => {
                let badgeClass = 'badge-warning';
                let statusText = 'অপেক্ষমান';

                if (complaint.status === 'resolved') {
                    badgeClass = 'badge-success';
                    statusText = 'সমাধান হয়েছে';
                } else if (complaint.status === 'rejected') {
                    badgeClass = 'badge-danger';
                    statusText = 'প্রত্যাখ্যাত';
                } else if (complaint.status === 'in-progress') {
                    badgeClass = 'badge-info';
                    statusText = 'প্রক্রিয়াধীন';
                }

                const date = new Date(complaint.createdAt).toLocaleString('bn-BD');

                return `
                    <div class="complaint-item ${complaint.status === 'resolved' ? 'resolved' : ''}">
                        <div class="complaint-header">
                            <span class="complaint-id">অভিযোগ #${complaint.complaintId}</span>
                            <span class="badge ${badgeClass}">${statusText}</span>
                        </div>
                        <div class="complaint-body">
                            <p class="complaint-text">${complaint.description}</p>
                            <div class="complaint-meta">
                                <span class="complaint-area">📍 ${complaint.votingArea || 'N/A'}</span>
                                <span class="complaint-date">📅 ${date}</span>
                                ${complaint.citizenNid ? `<span class="complaint-voter">👤 NID: ****${complaint.citizenNid.slice(-4)}</span>` : ''}
                            </div>
                            ${complaint.adminResponse ? `
                                <div class="admin-response">
                                    <strong>প্রশাসক মন্তব্য:</strong>
                                    <p>${complaint.adminResponse}</p>
                                </div>
                            ` : ''}
                        </div>
                        ${complaint.status === 'pending' ? `
                            <div class="complaint-actions">
                                <textarea class="form-control" placeholder="প্রশাসক মন্তব্য লিখুন..." rows="2"></textarea>
                                <div class="action-buttons">
                                    <button class="btn btn-success btn-sm" onclick="resolveComplaint('${complaint._id}')">সমাধান করুন</button>
                                    <button class="btn btn-danger btn-sm" onclick="rejectComplaint('${complaint._id}')">প্রত্যাখ্যান করুন</button>
                                </div>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        } else {
            complaintsListContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">কোনো অভিযোগ নেই</p>';
        }
    } catch (error) {
        console.error('Load complaints error:', error);
        complaintsListContainer.innerHTML = '<p style="text-align: center; color: #f44336;">অভিযোগ লোড করতে ব্যর্থ হয়েছে</p>';
    }
}

// Resolve complaint
async function resolveComplaint(complaintId) {
    const btn = event?.target;
    if (!btn) return;

    const complaintItem = btn.closest('.complaint-item');
    const textarea = complaintItem?.querySelector('textarea');

    if (!textarea || !textarea.value.trim()) {
        showAlert('অনুগ্রহ করে প্রশাসক মন্তব্য লিখুন', 'error');
        return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'সমাধান হচ্ছে...';

    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const response = await fetch(`${API_CONFIG.API_URL}/complaint/${complaintId}/resolve`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                adminResponse: textarea.value.trim()
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('অভিযোগ সফলভাবে সমাধান করা হয়েছে', 'success');
            loadComplaintsData();
        } else {
            showAlert(data.message || 'সমাধান করতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Resolve complaint error:', error);
        showAlert('সার্ভার ত্রুটি হয়েছে', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// Reject complaint
async function rejectComplaint(complaintId) {
    const btn = event?.target;
    if (!btn) return;

    const complaintItem = btn.closest('.complaint-item');
    const textarea = complaintItem?.querySelector('textarea');

    if (!textarea || !textarea.value.trim()) {
        showAlert('অনুগ্রহ করে প্রশাসক মন্তব্য লিখুন', 'error');
        return;
    }

    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'প্রত্যাখ্যান হচ্ছে...';

    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const response = await fetch(`${API_CONFIG.API_URL}/complaint/${complaintId}/reject`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                adminResponse: textarea.value.trim()
            })
        });

        const data = await response.json();

        if (data.success) {
            showAlert('অভিযোগ প্রত্যাখ্যান করা হয়েছে', 'success');
            loadComplaintsData();
        } else {
            showAlert(data.message || 'প্রত্যাখ্যান করতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Reject complaint error:', error);
        showAlert('সার্ভার ত্রুটি হয়েছে', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ===== ADMIN PROFILE FUNCTIONS =====

// Load admin profile
async function loadAdminProfile() {
    const adminInfoContainer = document.getElementById('admin-info-container');
    if (!adminInfoContainer) return;

    try {
        const adminData = JSON.parse(sessionStorage.getItem('nirapodh_admin_user') || '{}');

        adminInfoContainer.innerHTML = `
            <div class="info-item">
                <span class="info-label">প্রশাসক ID:</span>
                <span class="info-value">${adminData.username || 'N/A'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">ভূমিকা:</span>
                <span class="info-value">${adminData.role === 'superadmin' ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}</span>
            </div>
            <div class="info-item">
                <span class="info-label">লগইন সময়:</span>
                <span class="info-value">${new Date().toLocaleString('bn-BD')}</span>
            </div>
        `;
    } catch (error) {
        console.error('Load admin profile error:', error);
    }
}

// ===== PUBLISHED NOTICES FUNCTIONS =====

// Load published notices (stub - can be implemented later)
function loadPublishedNotices() {
    const publishedNoticesContainer = document.getElementById('publishedNoticesContainer');
    if (publishedNoticesContainer) {
        publishedNoticesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">নোটিশ শীঘ্রই উপলব্ধ হবে</p>';
    }
}

// ===== RESULTS MANAGEMENT FUNCTIONS =====

// Load ballots for results dropdown
async function loadBallotsForResults() {
    const selectBallot = document.getElementById('selectBallot');
    if (!selectBallot) return;

    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        console.log('❌ No token found for loading ballots');
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/ballots`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.success && data.ballots && data.ballots.length > 0) {
            selectBallot.innerHTML = '<option value="">ব্যালট নির্বাচন করুন</option>' +
                data.ballots.map(ballot => 
                    `<option value="${ballot._id}">${ballot.name} - ${ballot.location}</option>`
                ).join('');
            
            // Add change event listener
            selectBallot.addEventListener('change', function() {
                if (this.value) {
                    loadBallotResults(this.value);
                }
            });
        } else {
            selectBallot.innerHTML = '<option value="">কোনো ব্যালট নেই</option>';
        }
    } catch (error) {
        console.error('Load ballots for results error:', error);
        selectBallot.innerHTML = '<option value="">ব্যালট লোড করতে ব্যর্থ</option>';
    }
}

// Load ballot results from backend
async function loadBallotResults(ballotId) {
    const resultsSummary = document.querySelector('.results-summary');
    if (!resultsSummary) return;

    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showAlert('অনুমোদন প্রয়োজন', 'error');
        return;
    }

    // Show loading
    resultsSummary.innerHTML = '<p style="text-align: center; padding: 40px;">লোড হচ্ছে...</p>';

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/results/${ballotId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        console.log('Response status:', response.status);
        console.log('Response ok:', response.ok);
        
        // Check if response is ok
        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error text:', errorText);
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Results data:', data);

        if (data.success) {
            const { ballot, results, totalVotes } = data;
            const totalVoters = await getTotalVotersForArea(ballot.location);

            // Calculate turnout percentage
            const turnoutPercentage = totalVoters > 0 ? ((totalVotes / totalVoters) * 100).toFixed(2) : 0;

            // Render results
            resultsSummary.innerHTML = `
                <h3>ফলাফল সারসংক্ষেপ - ${ballot.name}</h3>
                <div class="result-stats">
                    <div class="result-stat">
                        <span class="result-label">মোট ভোটার:</span>
                        <span class="result-value">${toBengaliNumber(totalVoters)}</span>
                    </div>
                    <div class="result-stat">
                        <span class="result-label">প্রদত্ত ভোট:</span>
                        <span class="result-value">${toBengaliNumber(totalVotes)}</span>
                    </div>
                    <div class="result-stat">
                        <span class="result-label">ভোট প্রদানের হার:</span>
                        <span class="result-value">${toBengaliNumber(turnoutPercentage)}%</span>
                    </div>
                </div>

                <div class="candidate-results">
                    ${results.map(candidate => {
                        const votePercentage = totalVotes > 0 ? ((candidate.voteCount / totalVotes) * 100).toFixed(2) : 0;
                        const imageSrc = candidate.image || 'assets/images/default-avatar.png';
                        
                        let symbolHtml = '';
                        if (candidate.symbol && candidate.symbol.startsWith('data:')) {
                            symbolHtml = `<img src="${candidate.symbol}" alt="Party Symbol" width="16" height="16" style="vertical-align: middle;">`;
                        } else if (candidate.symbol) {
                            symbolHtml = `<img src="${candidate.symbol}" alt="Party Symbol" width="16" height="16" style="vertical-align: middle;" onerror="this.src='assets/images/powerful-symbol-unity-anti-corruption-day_968957-12635.avif'">`;
                        }

                        return `
                            <div class="candidate-result-item">
                                <div class="candidate-info">
                                    <div class="candidate-photo">
                                        <img src="${imageSrc}" alt="${candidate.name}" style="width: 32px; height: 32px; border-radius: 50%; object-fit: cover;" onerror="this.src='assets/images/default-avatar.png'">
                                    </div>
                                    <div>
                                        <h4>${candidate.name}</h4>
                                        <p>${candidate.party} ${symbolHtml ? '- ' + symbolHtml : ''}</p>
                                    </div>
                                </div>
                                <div class="vote-count">
                                    <span class="votes">${toBengaliNumber(candidate.voteCount)} ভোট</span>
                                    <div class="vote-bar">
                                        <div class="vote-fill" style="width: ${votePercentage}%"></div>
                                    </div>
                                    <span class="percentage">${toBengaliNumber(votePercentage)}%</span>
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            `;
        } else {
            resultsSummary.innerHTML = `<p style="text-align: center; color: #f44336; padding: 40px;">${data.message || 'ফলাফল লোড করতে ব্যর্থ হয়েছে'}</p>`;
        }
    } catch (error) {
        console.error('Load ballot results error:', error);
        resultsSummary.innerHTML = '<p style="text-align: center; color: #f44336; padding: 40px;">ফলাফল লোড করতে ব্যর্থ হয়েছে</p>';
    }
}

// Get total voters for a specific area
async function getTotalVotersForArea(area) {
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const response = await fetch(`${API_CONFIG.API_URL}/admin/users?area=${area}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();
        return data.success ? data.count : 0;
    } catch (error) {
        console.error('Get total voters error:', error);
        return 0;
    }
}

// Calculate/Recalculate results - refresh the displayed results
async function calculateResults() {
    const btn = event?.target || null;
    const originalText = btn?.textContent || 'গণনা করুন';
    
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
        btn.textContent = 'গণনা চলছে...';
    }
    
    const selectBallot = document.getElementById('selectBallot');
    const ballotId = selectBallot?.value;
    
    if (!ballotId) {
        showAlert('অনুগ্রহ করে একটি ব্যালট নির্বাচন করুন', 'warning');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
        }
        return;
    }
    
    try {
        await loadBallotResults(ballotId);
        showAlert('ফলাফল সফলভাবে গণনা করা হয়েছে!', 'success');
    } catch (error) {
        showAlert('ফলাফল গণনা করতে ব্যর্থ হয়েছে', 'error');
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
        }
    }
}
