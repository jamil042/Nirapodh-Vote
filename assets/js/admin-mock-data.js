
// Mock Data for Dashboard
const mockDashboardData = {
    stats: {
        totalBallots: 12,
        activeVotes: 3,
        totalVoters: "১,২৫,৪৫০",
        votesCast: "৮৫,৩২০"
    },
    liveStats: [
        { seat: "ঢাকা-১ আসন", votes: "৪৫,২৩৪", percentage: 68 },
        { seat: "চট্টগ্রাম-২ আসন", votes: "৩২,১৮৯", percentage: 55 },
        { seat: "সিলেট-৩ আসন", votes: "৭,৮৯৭", percentage: 42 }
    ],
    activities: [
        { time: "৫ মিনিট আগে", text: 'নতুন ব্যালট "ঢাকা-৫ আসন" তৈরি হয়েছে' },
        { time: "১৫ মিনিট আগে", text: "১২৩ জন নতুন ভোটার নিবন্ধিত হয়েছে" },
        { time: "৩০ মিনিট আগে", text: 'নোটিশ প্রকাশ: "ভোটিং সময় বৃদ্ধি"' }
    ],
    candidates: [
        {
            id: 1,
            name: "ওসমান হাদি",
            party: "স্বতন্ত্র প্রার্থী",
            symbolSvg: `<img src="assets/images/powerful-symbol-unity-anti-corruption-day_968957-12635.avif" alt="Party Symbol" width="20" height="20">`,
            area: "ঢাকা-৮",
            status: "active", // active, inactive
            image: "assets/images/WhatsApp Image 2025-12-27 at 11.35.15 PM.jpeg"
        },
        {
            id: 2,
            name: "হাসনাত আবদুল্লাহ",
            party: "ন্যাশনাল সিটিজেন পার্টি (এনসিপি)",
            symbolSvg: `<img src="assets/images/জাতীয়_নাগরিক_পার্টির_লোগো.svg.png" alt="Party Symbol" width="20" height="20">`,
            area: "রংপুর-৩",
            status: "active",
            image: "assets/images/hasnat.jpg" // Placeholder if image not available
        }
    ],
    complaints: [
        {
            id: "০০১",
            status: "pending", // pending, resolved, rejected
            date: "৩ ডিসেম্বর ২০২৫, ২:৩০ PM",
            text: "আমার ভোট সঠিকভাবে রেজিস্টার হয়নি। অনুগ্রহ করে যাচাই করুন।",
            area: "ঢাকা-১",
            voterId: "****5678"
        },
        {
            id: "০০২",
            status: "resolved",
            date: "২ ডিসেম্বর ২০২৫, ১০:১৫ AM",
            text: "ভোট কেন্দ্রের অবস্থান ভুল দেখানো হচ্ছে।",
            area: "চট্টগ্রাম-৩",
            voterId: "****9012"
        }
    ]
};

function loadDashboardData() {
    // Load Stats
    const totalBallotsEl = document.getElementById('total-ballots');
    const activeVotesEl = document.getElementById('active-votes');
    const totalVotersEl = document.getElementById('total-voters');
    const votesCastEl = document.getElementById('votes-cast');

    if (totalBallotsEl) totalBallotsEl.textContent = toBengaliNumber(mockDashboardData.stats.totalBallots);
    if (activeVotesEl) activeVotesEl.textContent = toBengaliNumber(mockDashboardData.stats.activeVotes);
    if (totalVotersEl) totalVotersEl.textContent = mockDashboardData.stats.totalVoters;
    if (votesCastEl) votesCastEl.textContent = mockDashboardData.stats.votesCast;

    // Load Live Stats
    const liveStatsContainer = document.getElementById('live-stats-container');
    if (liveStatsContainer) {
        liveStatsContainer.innerHTML = mockDashboardData.liveStats.map(stat => `
            <div class="live-stat-item">
                <span class="live-label">${stat.seat}:</span>
                <span class="live-value">${stat.votes} ভোট</span>
                <span class="live-percentage">${toBengaliNumber(stat.percentage)}%</span>
            </div>
        `).join('');
    }

    // Load Activities
    const activityListContainer = document.getElementById('activity-list-container');
    if (activityListContainer) {
        activityListContainer.innerHTML = mockDashboardData.activities.map(activity => `
            <div class="activity-item">
                <span class="activity-time">${activity.time}</span>
                <p>${activity.text}</p>
            </div>
        `).join('');
    }
}

function loadCandidatesData() {
    const candidatesTableBody = document.getElementById('candidatesTableBody');
    if (candidatesTableBody) {
        candidatesTableBody.innerHTML = mockDashboardData.candidates.map(candidate => {
            const statusBadge = candidate.status === 'active' 
                ? '<span class="badge badge-success">সক্রিয়</span>' 
                : '<span class="badge badge-danger">নিষ্ক্রিয়</span>';
            
            // Handle image error with a default fallback
            const imageSrc = candidate.image || 'assets/images/default-avatar.png';

            return `
                <tr>
                    <td>
                        <div class="candidate-photo">
                            <img src="${imageSrc}" alt="${candidate.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='assets/images/default-avatar.png'">
                        </div>
                    </td>
                    <td>${candidate.name}</td>
                    <td>${candidate.party}</td>
                    <td>
                        <div class="party-symbol">
                            ${candidate.symbolSvg}
                        </div>
                    </td>
                    <td>${candidate.area}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn-icon" onclick="viewCandidateDetails(${candidate.id})" title="বিস্তারিত দেখুন">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="editCandidate(${candidate.id})">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                        <button class="btn-icon" onclick="deleteCandidate(${candidate.id})">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                                <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                            </svg>
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function loadComplaintsData() {
    const complaintsListContainer = document.getElementById('complaints-list-container');
    if (complaintsListContainer) {
        complaintsListContainer.innerHTML = mockDashboardData.complaints.map(complaint => {
            let badgeClass = 'badge-warning';
            let statusText = 'অপেক্ষমান';
            
            if (complaint.status === 'resolved') {
                badgeClass = 'badge-success';
                statusText = 'সমাধানকৃত';
            } else if (complaint.status === 'rejected') {
                badgeClass = 'badge-danger';
                statusText = 'প্রত্যাখ্যাত';
            }

            return `
                <div class="complaint-item">
                    <div class="complaint-header">
                        <h4>অভিযোগ #${complaint.id}</h4>
                        <span class="badge ${badgeClass}">${statusText}</span>
                    </div>
                    <p class="complaint-date">জমা: ${complaint.date}</p>
                    <p class="complaint-text">${complaint.text}</p>
                    <div class="complaint-meta">
                        <span>এলাকা: ${complaint.area}</span>
                        <span>ভোটার ID: ${complaint.voterId}</span>
                    </div>
                    <div class="form-group">
                        <label>প্রশাসক মন্তব্য</label>
                        <textarea rows="3" placeholder="আপনার প্রতিক্রিয়া লিখুন..."></textarea>
                    </div>
                    <div class="form-group">
                        <label>প্রমাণপত্র আপলোড করুন (যদি থাকে)</label>
                        <input type="file" accept=".pdf,.jpg,.png">
                    </div>
                    <div class="complaint-actions">
                        <button class="btn btn-sm btn-primary">সমাধান করুন</button>
                        <button class="btn btn-sm btn-danger">প্রত্যাখ্যান করুন</button>
                    </div>
                </div>
            `;
        }).join('');
    }
}
