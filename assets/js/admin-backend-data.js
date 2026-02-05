// Admin Backend Data Functions - All data fetched from backend/database

// ===== DASHBOARD FUNCTIONS =====

// Load Dashboard Statistics from backend
async function loadDashboardData() {
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        console.log('❌ No token found');
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/statistics`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const stats = data.statistics;

            // Update stat cards
            const totalBallots = document.getElementById('total-ballots');
            const activeVotes = document.getElementById('active-votes');
            const totalVoters = document.getElementById('total-voters');
            const votesCast = document.getElementById('votes-cast');

            if (totalBallots) totalBallots.textContent = stats.totalBallots || '০';
            if (activeVotes) activeVotes.textContent = stats.totalVotes || '০';
            if (totalVoters) totalVoters.textContent = stats.totalUsers || '০';
            if (votesCast) votesCast.textContent = stats.votersWhoVoted || '০';

            // Load activity list (can be enhanced later)
            const activityListContainer = document.getElementById('activity-list-container');
            if (activityListContainer) {
                activityListContainer.innerHTML = `
                    <div class="activity-item">
                        <span class="activity-time">এখন</span>
                        <p class="activity-text">মোট ${stats.totalUsers} জন নিবন্ধিত ভোটার</p>
                    </div>
                    <div class="activity-item">
                        <span class="activity-time">আজ</span>
                        <p class="activity-text">${stats.votersWhoVoted} জন ভোট প্রদান করেছেন</p>
                    </div>
                    <div class="activity-item">
                        <span class="activity-time">পরিসংখ্যান</span>
                        <p class="activity-text">টার্নআউট: ${stats.turnoutPercentage}%</p>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('Load dashboard data error:', error);
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
