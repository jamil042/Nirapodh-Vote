let candidateCount = 0;

// Custom Ballot Arrays (20 items each)
let customBallotNames = new Array(20);
let customBallotLocations = new Array(20);
let ballotNameCount = 0;
let ballotLocationCount = 0;

// Custom Candidates Array (50 items max)
let customCandidates = new Array(50);
let customCandidateCount = 0;

// Notice management moved to admin-notices.js

// ===== TOAST NOTIFICATION SYSTEM =====
function showAlert(title, type = 'info', duration = 3000) {
    const alertContainer = document.getElementById('alert-container') || createAlertContainer();
    
    const alert = document.createElement('div');
    alert.className = `alert alert-${type}`;
    alert.innerHTML = `
        <div class="alert-content">
            <span class="alert-message">${title}</span>
            <button class="alert-close" onclick="this.parentElement.parentElement.remove()">×</button>
        </div>
    `;
    
    alertContainer.appendChild(alert);
    
    setTimeout(() => {
        alert.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        alert.classList.remove('show');
        setTimeout(() => alert.remove(), 300);
    }, duration);
}

function createAlertContainer() {
    const container = document.createElement('div');
    container.id = 'alert-container';
    container.className = 'alert-container';
    document.body.appendChild(container);
    return container;
}

document.addEventListener('DOMContentLoaded', function() {
    // Check if admin is logged in
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        window.location.href = 'admin-login.html';
        return;
    }
    
    initializeDashboard();
});

function initializeDashboard() {
    loadDashboardData(); // Load mock data
    loadCandidatesData(); // Load mock candidates data
    loadComplaintsData(); // Load mock complaints data
    loadAdminProfile(); // Load mock admin info
    renderCharts(); // Render charts
    populateBallotFormOptions(); // Load ballot form options from mock data
    loadPublishedNotices(); // Load published notices
    loadExistingBallots(); // Load existing ballots for superadmin
    checkAdminRole(); // Check if superadmin and show admin creation section
    
    // Mark card for superadmin styling and show/hide hints
    const adminData = sessionStorage.getItem('nirapodh_admin_user');
    if (adminData) {
        const admin = JSON.parse(adminData);
        const ballotFormCard = document.getElementById('ballotFormCard');
        if (ballotFormCard) {
            if (admin.role === 'superadmin') {
                ballotFormCard.setAttribute('data-superadmin', 'true');
            } else {
                // Hide the superadmin hint for normal admins
                const hint = ballotFormCard.querySelector('p');
                if (hint && hint.textContent.includes('সুপার অ্যাডমিন')) {
                    hint.style.display = 'none';
                }
            }
        }
    }

    const ballotForm = document.getElementById('ballotForm');
    if (ballotForm) {
        ballotForm.addEventListener('submit', handleBallotSubmit);
    }
    
    // Notice form handler moved to admin-notices.js
    
    const createAdminForm = document.getElementById('createAdminForm');
    if (createAdminForm) {
        createAdminForm.addEventListener('submit', handleCreateAdmin);
    }
    
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }
}

function populateBallotFormOptions() {
    // Use the new loadBallotOptions function that fetches from backend
    loadBallotOptions();
}

function renderCharts() {
    // Charts will be populated with real data from backend
    // For now, display placeholder charts
    const turnoutCtx = document.getElementById('turnoutChart');
    if (turnoutCtx && typeof Chart !== 'undefined') {
        // Sample data for turnout chart
        const turnoutData = {
            labels: ['সকাল ৮টা', '১০টা', '১২টা', '২টা', '৪টা'],
            percentage: [15, 35, 55, 70, 85]
        };
        
        new Chart(turnoutCtx, {
            type: 'line',
            data: {
                labels: turnoutData.labels,
                datasets: [{
                    label: 'টার্নআউট শতাংশ (%)',
                    data: turnoutData.percentage,
                    borderColor: '#1976d2',
                    backgroundColor: 'rgba(25, 118, 210, 0.05)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#1976d2',
                    pointBorderColor: '#fff',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        display: true,
                        labels: {
                            font: {
                                size: 12,
                                family: "'Roboto', sans-serif"
                            },
                            color: '#666',
                            padding: 12
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            font: {
                                size: 11
                            },
                            color: '#999'
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11
                            },
                            color: '#999'
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }

    // Results Chart (Doughnut Chart)
    const resultCtx = document.getElementById('resultChart');
    if (resultCtx && typeof Chart !== 'undefined') {
        // Sample data for results chart
        const resultData = {
            labels: ['প্রার্থী ক', 'প্রার্থী খ', 'প্রার্থী গ'],
            data: [45, 35, 20]
        };
        
        new Chart(resultCtx, {
            type: 'doughnut',
            data: {
                labels: resultData.labels,
                datasets: [{
                    data: resultData.data,
                    backgroundColor: [
                        '#1976d2',
                        '#f57c00',
                        '#d32f2f'
                    ],
                    borderColor: '#fff',
                    borderWidth: 2
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            font: {
                                size: 11,
                                family: "'Roboto', sans-serif"
                            },
                            color: '#666',
                            padding: 12,
                            usePointStyle: true
                        }
                    }
                },
                cutout: '62%'
            }
        });
    }
}

function showSection(sectionId) {
    // Check if trying to access chat section
    if (sectionId === 'chat') {
        const adminData = sessionStorage.getItem('nirapodh_admin_user');
        if (adminData) {
            const admin = JSON.parse(adminData);
            if (admin.role !== 'superadmin') {
                showAlert('শুধুমাত্র সুপার অ্যাডমিন নাগরিক চ্যাট অ্যাক্সেস করতে পারবেন', 'error');
                return;
            }
        } else {
            return;
        }
    }
    
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedSection = document.getElementById(sectionId + '-section');
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    // Find and activate the clicked nav item
    const clickedNavItem = document.querySelector(`.nav-item[onclick*="${sectionId}"]`);
    if (clickedNavItem) {
        clickedNavItem.classList.add('active');
    }
    
    // Load candidates when switching to candidates section
    if (sectionId === 'candidates' && typeof loadCandidates === 'function') {
        loadCandidates();
    }

    // Initialize admin-to-admin chat when switching to admin-chat section
    if (sectionId === 'admin-chat' && typeof initAdminToAdminChat === 'function') {
        initAdminToAdminChat();
    }
}

function addCandidate() {
    candidateCount++;
    const candidatesList = document.getElementById('candidatesList');
    
    const candidateCard = document.createElement('div');
    candidateCard.className = 'card mt-20';
    candidateCard.id = `candidate-${candidateCount}`;
    candidateCard.innerHTML = `
        <h4>প্রার্থী #${toBengaliNumber(candidateCount)}</h4>
        <div class="form-row">
            <div class="form-group">
                <label>প্রার্থীর নাম *</label>
                <input type="text" class="candidate-name" required placeholder="প্রার্থীর পূর্ণ নাম">
            </div>
            <div class="form-group">
                <label>রাজনৈতিক দল *</label>
                <input type="text" class="candidate-party" required placeholder="যেমন: জাতীয় নাগরিক পার্টি">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>প্রার্থীর ছবি</label>
                <input type="file" class="candidate-image" accept="image/*">
            </div>
            <div class="form-group">
                <label>দলীয় প্রতীক (মার্কা)</label>
                <input type="file" class="candidate-symbol" accept="image/*">
            </div>
        </div>
        
        <!-- New Fields -->
        <div class="form-group">
            <label>জীবনী (Bio)</label>
            <textarea class="candidate-bio" rows="3" placeholder="প্রার্থীর সংক্ষিপ্ত জীবনী..."></textarea>
        </div>
        <div class="form-group">
            <label>নির্বাচনী ইশতেহার (Manifesto)</label>
            <textarea class="candidate-manifesto" rows="3" placeholder="ইশতেহারের পয়েন্টগুলো লিখুন..."></textarea>
        </div>
        <div class="form-group">
            <label>সামাজিক কর্মকাণ্ড</label>
            <textarea class="candidate-social" rows="2" placeholder="সামাজিক কর্মকাণ্ডের বিবরণ..."></textarea>
        </div>
        <div class="form-group">
            <label>দলীয় ইতিহাস</label>
            <textarea class="candidate-history" rows="2" placeholder="দলের সংক্ষিপ্ত ইতিহাস..."></textarea>
        </div>

        <div class="form-row">
            <div class="form-group">
                <label>নির্বাচনী এলাকা *</label>
                <input type="text" class="candidate-area" required placeholder="যেমন: ঢাকা-১০">
            </div>
            <div class="form-group">
                <label>অবস্থা</label>
                <select class="candidate-status">
                    <option value="active">সক্রিয়</option>
                    <option value="inactive">নিষ্ক্রিয়</option>
                </select>
            </div>
        </div>

        <div style="display: flex; gap: 10px;">
            <button type="button" class="btn btn-danger btn-sm" onclick="removeCandidate(${candidateCount})">
                এই প্রার্থী সরান
            </button>
        </div>
    `;
    
    candidatesList.appendChild(candidateCard);
}

function removeCandidate(id) {
    const candidateCard = document.getElementById(`candidate-${id}`);
    if (candidateCard) {
        candidateCard.remove();
    }
}

// Delete candidate from database
async function deleteCandidateFromDB(candidateId) {
    if (!confirm('আপনি কি এই প্রার্থী মুছে ফেলতে চান?')) {
        return;
    }
    
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showAlert('অনুমোদন প্রয়োজন। পুনরায় লগইন করুন', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates/${candidateId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message || 'প্রার্থী সফলভাবে মুছে ফেলা হয়েছে', 'success');
            loadCandidatesData();
        } else {
            showAlert(result.message || 'প্রার্থী মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Delete candidate error:', error);
        showAlert('প্রার্থী মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
    }
}

function handleBallotSubmit(e) {
    e.preventDefault();
    
    const ballotName = document.getElementById('ballotName').value;
    const ballotLocation = document.getElementById('ballotLocation').value;
    
    if (!ballotName || !ballotLocation) {
        showAlert('সকল প্রয়োজনীয় তথ্য পূরণ করুন', 'error');
        return;
    }
    
    // Collect all candidate data from the form
    const candidateCards = document.querySelectorAll('#candidatesList .card');
    const candidates = [];
    
    candidateCards.forEach(card => {
        const name = card.querySelector('.candidate-name')?.value?.trim();
        const party = card.querySelector('.candidate-party')?.value?.trim();
        const area = card.querySelector('.candidate-area')?.value?.trim();
        const bio = card.querySelector('.candidate-bio')?.value?.trim();
        const manifesto = card.querySelector('.candidate-manifesto')?.value?.trim();
        const socialWork = card.querySelector('.candidate-social')?.value?.trim();
        const partyHistory = card.querySelector('.candidate-history')?.value?.trim();
        const status = card.querySelector('.candidate-status')?.value || 'active';
        
        // Get image files
        const imageInput = card.querySelector('.candidate-image');
        const symbolInput = card.querySelector('.candidate-symbol');
        
        if (name && party && area) {
            candidates.push({
                name,
                party,
                area,
                bio,
                manifesto,
                socialWork,
                partyHistory,
                status,
                imageFile: imageInput?.files[0],
                symbolFile: symbolInput?.files[0]
            });
        }
    });
    
    if (candidates.length === 0) {
        showAlert('অন্তত একজন প্রার্থী যোগ করুন', 'error');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
        const originalText = btn.textContent;
        btn.textContent = 'তৈরি হচ্ছে...';
        
        // Process images and save candidates
        processCandidatesAndSave(ballotName, ballotLocation, candidates, btn, originalText);
    }
}

// Process candidate images and save to DB
async function processCandidatesAndSave(ballotName, area, candidates, btn, originalText) {
    const processedCandidates = [];
    
    // Process each candidate's images
    for (const candidate of candidates) {
        const processed = {
            name: candidate.name,
            party: candidate.party,
            area: candidate.area,
            bio: candidate.bio,
            manifesto: candidate.manifesto,
            socialWork: candidate.socialWork,
            partyHistory: candidate.partyHistory,
            status: candidate.status,
            image: 'assets/images/default-avatar.png',
            symbol: ''
        };
        
        // Read image file if exists
        if (candidate.imageFile) {
            try {
                processed.image = await readFileAsDataURL(candidate.imageFile);
            } catch (err) {
                console.error('Error reading image:', err);
            }
        }
        
        // Read symbol file if exists
        if (candidate.symbolFile) {
            try {
                processed.symbol = await readFileAsDataURL(candidate.symbolFile);
            } catch (err) {
                console.error('Error reading symbol:', err);
            }
        }
        
        processedCandidates.push(processed);
    }
    
    // Save to database
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showAlert('অনুমোদন প্রয়োজন। পুনরায় লগইন করুন', 'error');
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = originalText;
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ballotName,
                area,
                candidates: processedCandidates
            })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message || 'ব্যালট সফলভাবে তৈরি হয়েছে!', 'success');
            
            // Reset form
            document.getElementById('ballotForm').reset();
            candidateCount = 0;
            document.getElementById('candidatesList').innerHTML = '';
            
            // Reload candidates table
            loadCandidatesData();
        } else {
            showAlert(result.message || 'ব্যালট তৈরি করতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Save candidates error:', error);
        showAlert('ব্যালট তৈরি করতে ব্যর্থ হয়েছে', 'error');
    } finally {
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = originalText;
    }
}

// Helper function to read file as DataURL
function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = (e) => reject(e);
        reader.readAsDataURL(file);
    });
}

function previewBallot() {
    showAlert('ব্যালট পূর্বরূপ শীঘ্রই উপলব্ধ হবে', 'info');
}

function toggleNoticeContent(type) {
    const textContent = document.getElementById('textContent');
    const pdfContent = document.getElementById('pdfContent');
    
    if (type === 'text') {
        textContent.classList.remove('hidden');
        pdfContent.classList.add('hidden');
    } else {
        textContent.classList.add('hidden');
        pdfContent.classList.remove('hidden');
    }
}

// Notice functions moved to admin-notices.js

function oldSaveNoticeToArray_REMOVED(title, type, contentType, message, pdfData) {
    const now = new Date();
    const dateStr = now.toLocaleDateString('bn-BD', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    const notice = {
        id: customNoticeCount + 1000,
        title: title,
        type: type,
        contentType: contentType,
        message: message,
        pdfData: pdfData,
        date: dateStr,
        createdAt: new Date()
    };
    
    customNotices[customNoticeCount] = notice;
    customNoticeCount++;
    
    showAlert(`"${title}" নোটিশ সফলভাবে প্রকাশিত হয়েছে!`, 'success');
}

function resetNoticeForm(btn, originalText) {
    setTimeout(() => {
        document.getElementById('noticeForm').reset();
        document.getElementById('textContent').classList.remove('hidden');
        document.getElementById('pdfContent').classList.add('hidden');
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = originalText;
    }, 500);
}

// Notice functions removed - moved to admin-notices.js

function calculateResults() {
    const btn = event?.target || null;
    const originalText = btn?.textContent || 'গণনা করুন';
    
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
        btn.textContent = 'গণনা চলছে...';
    }
    
    setTimeout(() => {
        showAlert('ফলাফল সফলভাবে গণনা করা হয়েছে!', 'success');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
        }
    }, 1500);
}

function exportResults() {
    const btn = event?.target || null;
    const originalText = btn?.textContent || 'PDF রপ্তানি';
    
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
        btn.textContent = 'রপ্তানি হচ্ছে...';
    }
    
    setTimeout(() => {
        showAlert('ফলাফল PDF হিসেবে রপ্তানি হয়েছে!', 'success');
        if (btn) {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
        }
    }, 1500);
}

function publishResults() {
    if (confirm('আপনি কি ফলাফল প্রকাশ করতে চান? প্রকাশের পর সকল নাগরিক দেখতে পারবে।')) {
        const btn = event?.target || null;
        const originalText = btn?.textContent || 'প্রকাশ করুন';
        
        if (btn) {
            btn.disabled = true;
            btn.classList.add('btn-loading');
            btn.textContent = 'প্রকাশিত হচ্ছে...';
        }
        
        setTimeout(() => {
            showAlert('ফলাফল সফলভাবে প্রকাশিত হয়েছে!', 'success');
            if (btn) {
                btn.disabled = false;
                btn.classList.remove('btn-loading');
                btn.textContent = originalText;
            }
        }, 1500);
    }
}

// editCandidate and deleteCandidate moved to admin-candidates.js
// Old mock versions removed

function addNewBallotOption() {
    const newBallotNameInput = document.getElementById('newBallotName');
    const newBallotLocationInput = document.getElementById('newBallotLocation');
    
    const ballotName = (newBallotNameInput?.value || '').trim();
    const ballotLocation = (newBallotLocationInput?.value || '').trim();
    
    // Validation
    if (!ballotName || !ballotLocation) {
        showAlert('অনুগ্রহ করে ব্যালটের নাম এবং নির্বাচন এলাকা উভয়ই লিখুন', 'warning');
        return;
    }
    
    // Call backend API to save ballot
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showAlert('অনুমোদন প্রয়োজন। পুনরায় লগইন করুন', 'error');
        window.location.href = 'admin-login.html';
        return;
    }
    
    // Show loading
    const btn = event.target;
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'যোগ হচ্ছে...';
    
    fetch(`${API_CONFIG.API_URL}/admin/ballots`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
            name: ballotName,
            location: ballotLocation
        })
    })
    .then(response => {
        console.log('Ballot add response status:', response.status);
        return response.json();
    })
    .then(result => {
        console.log('Ballot add result:', result);
        if (result.success) {
            showAlert(result.message || 'ব্যালট সফলভাবে যোগ হয়েছে!', 'success');
            newBallotNameInput.value = '';
            newBallotLocationInput.value = '';
            
            // Reload ballot dropdowns
            loadBallotOptions();
        } else {
            showAlert(result.message || 'ব্যালট যোগ করতে ব্যর্থ হয়েছে', 'error');
        }
    })
    .catch(error => {
        console.error('Add ballot error:', error);
        showAlert('সার্ভার ত্রুটি হয়েছে', 'error');
    })
    .finally(() => {
        btn.disabled = false;
        btn.textContent = originalText;
    });
}

// Load ballot options from backend
async function loadBallotOptions() {
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        console.log('❌ No token found for loading ballot options');
        return;
    }
    
    try {
        // Fetch all ballots to build a map
        const ballotsResponse = await fetch(`${API_CONFIG.API_URL}/admin/ballots`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const ballotsData = await ballotsResponse.json();
        
        console.log('✅ Ballots loaded:', ballotsData);
        
        // Store ballots in global variable for context menu access
        window.allBallots = ballotsData.ballots || [];
        
        // Get unique ballot names
        const ballotNames = [...new Set(window.allBallots.map(b => b.name))].sort();
        
        console.log('✅ Ballot names:', ballotNames);
        
        // Update ballot names dropdown
        const ballotNameSelect = document.getElementById('ballotName');
        const ballotLocationSelect = document.getElementById('ballotLocation');
        
        if (ballotNameSelect && ballotNames.length > 0) {
            ballotNameSelect.innerHTML = '<option value="">নির্বাচন করুন</option>' +
                ballotNames.map(name => `<option value="${name}">${name}</option>`).join('');
            
            // Remove old event listeners
            const oldListener = ballotNameSelect.onchange;
            ballotNameSelect.onchange = null;
            ballotNameSelect.removeEventListener('change', handleBallotNameChange);
            ballotNameSelect.removeEventListener('contextmenu', handleBallotNameContextMenu);
            
            // Add event listeners
            ballotNameSelect.addEventListener('change', handleBallotNameChange);
            ballotNameSelect.addEventListener('contextmenu', handleBallotNameContextMenu);
        }
        
        // Initially empty the dropdown
        if (ballotLocationSelect) {
            ballotLocationSelect.innerHTML = '<option value="">প্রথমে ব্যালটের নাম নির্বাচন করুন</option>';
            ballotLocationSelect.disabled = true;
            
            // Add context menu to location dropdown
            ballotLocationSelect.removeEventListener('contextmenu', handleBallotLocationContextMenu);
            ballotLocationSelect.addEventListener('contextmenu', handleBallotLocationContextMenu);
        }
    } catch (error) {
        console.error('Load ballot options error:', error);
    }
}

// Handle ballot name change to filter locations
function handleBallotNameChange(e) {
    const selectedBallotName = e.target.value;
    const ballotLocationSelect = document.getElementById('ballotLocation');
    
    if (!ballotLocationSelect) return;
    
    // Reset location dropdown
    ballotLocationSelect.innerHTML = '<option value="">লোড হচ্ছে...</option>';
    ballotLocationSelect.disabled = true;
    
    if (!selectedBallotName) {
        ballotLocationSelect.innerHTML = '<option value="">প্রথমে ব্যালটের নাম নির্বাচন করুন</option>';
        ballotLocationSelect.disabled = true;
        return;
    }
    
    // Filter locations from the stored ballots data
    if (!window.allBallots) {
        ballotLocationSelect.innerHTML = '<option value="">ডেটা লোড হয়নি</option>';
        return;
    }
    
    const filteredLocations = window.allBallots
        .filter(ballot => ballot.name === selectedBallotName)
        .map(ballot => ballot.location)
        .sort();
    
    if (filteredLocations.length > 0) {
        ballotLocationSelect.innerHTML = '<option value="">এলাকা নির্বাচন করুন</option>' +
            filteredLocations.map(location => `<option value="${location}">${location}</option>`).join('');
        ballotLocationSelect.disabled = false;
    } else {
        ballotLocationSelect.innerHTML = '<option value="">এই ব্যালটের জন্য কোনো এলাকা নেই</option>';
        ballotLocationSelect.disabled = true;
        showAlert('এই ব্যালটের জন্য এখনো কোনো এলাকা যোগ করা হয়নি', 'info');
    }
}

// Handle context menu for ballot name dropdown
function handleBallotNameContextMenu(e) {
    e.preventDefault();
    
    const adminData = sessionStorage.getItem('nirapodh_admin_user');
    if (!adminData) return;
    
    const admin = JSON.parse(adminData);
    if (admin.role !== 'superadmin') {
        showAlert('শুধুমাত্র সুপার অ্যাডমিন ব্যালট মুছতে পারবেন', 'error');
        return;
    }
    
    const ballotNameSelect = document.getElementById('ballotName');
    const selectedBallotName = ballotNameSelect.value;
    
    if (!selectedBallotName) {
        showAlert('প্রথমে একটি ব্যালট নির্বাচন করুন', 'warning');
        return;
    }
    
    // Check if this ballot has any areas
    const areasForBallot = window.allBallots.filter(b => b.name === selectedBallotName);
    
    if (areasForBallot.length > 0) {
        showAlert(`প্রথমে "${selectedBallotName}" এর সকল এলাকা মুছে ফেলুন, তারপর ব্যালট মুছতে পারবেন`, 'warning');
        return;
    }
    
    // No areas left, this shouldn't happen but handle it
    showAlert('এই ব্যালটের কোনো এলাকা নেই', 'info');
}

// Handle context menu for ballot location dropdown
function handleBallotLocationContextMenu(e) {
    e.preventDefault();
    
    const adminData = sessionStorage.getItem('nirapodh_admin_user');
    if (!adminData) return;
    
    const admin = JSON.parse(adminData);
    if (admin.role !== 'superadmin') {
        showAlert('শুধুমাত্র সুপার অ্যাডমিন এলাকা মুছতে পারবেন', 'error');
        return;
    }
    
    const ballotNameSelect = document.getElementById('ballotName');
    const ballotLocationSelect = document.getElementById('ballotLocation');
    
    const selectedBallotName = ballotNameSelect.value;
    const selectedLocation = ballotLocationSelect.value;
    
    if (!selectedBallotName || !selectedLocation) {
        showAlert('প্রথমে ব্যালট ও এলাকা নির্বাচন করুন', 'warning');
        return;
    }
    
    // Find the ballot ID for this name and location combination
    const ballotToDelete = window.allBallots.find(
        b => b.name === selectedBallotName && b.location === selectedLocation
    );
    
    if (!ballotToDelete) {
        showAlert('ব্যালট পাওয়া যায়নি', 'error');
        return;
    }
    
    // Show confirmation dialog
    const areasCount = window.allBallots.filter(b => b.name === selectedBallotName).length;
    let confirmMsg = `আপনি কি নিশ্চিত যে "${selectedBallotName} - ${selectedLocation}" মুছে ফেলতে চান?\n\nসতর্কতা: এটি সকল অ্যাডমিনের জন্য মুছে যাবে।`;
    
    if (areasCount === 1) {
        confirmMsg += `\n\nএটি "${selectedBallotName}" এর শেষ এলাকা। এটি মুছলে ব্যালটটিও সম্পূর্ণভাবে মুছে যাবে।`;
    }
    
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // Delete the ballot
    deleteBallotById(ballotToDelete._id, selectedBallotName, selectedLocation);
}

// Delete ballot by ID
async function deleteBallotById(ballotId, ballotName, ballotLocation) {
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showAlert('অনুমোদন প্রয়োজন। পুনরায় লগইন করুন', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/admin/ballots/${ballotId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        const result = await response.json();
        
        if (result.success) {
            showAlert(result.message || 'ব্যালট সফলভাবে মুছে ফেলা হয়েছে', 'success');
            // Reload ballot options
            loadBallotOptions();
        } else {
            showAlert(result.message || 'ব্যালট মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Delete ballot error:', error);
        showAlert('ব্যালট মুছে ফেলতে ব্যর্থ হয়েছে', 'error');
    }
}

// Load existing ballots for superadmin (simplified - no longer shows separate card)
async function loadExistingBallots() {
    // This function is now simplified since we use context menu instead
    // Just reload the ballot options to keep data fresh
    return loadBallotOptions();
}


function togglePasswordChange() {
    const container = document.getElementById('passwordChangeContainer');
    if (container) {
        if (container.style.display === 'none' || !container.style.display) {
            container.style.display = 'block';
            // Add smooth animation
            setTimeout(() => {
                container.classList.add('show');
            }, 10);
            // Scroll to the form
            container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        } else {
            container.classList.remove('show');
            setTimeout(() => {
                container.style.display = 'none';
                // Clear form when closing
                const form = document.getElementById('changePasswordForm');
                if (form) form.reset();
            }, 300);
        }
    }
}

function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showAlert('নতুন পাসওয়ার্ড মিলছে না', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showAlert('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে', 'error');
        return;
    }
    
    const btn = e.target.querySelector('button[type="submit"]');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('btn-loading');
        const originalText = btn.textContent;
        btn.textContent = 'পরিবর্তন হচ্ছে...';
        
        // Call backend API
        const token = sessionStorage.getItem('nirapodh_admin_token');
        fetch(`${API_CONFIG.API_URL}/admin/change-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                currentPassword,
                newPassword,
                confirmPassword: confirmNewPassword
            })
        })
        .then(response => response.json())
        .then(result => {
            if (result.success) {
                showAlert(result.message || 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!', 'success');
                e.target.reset();
                // Close the password change form after successful change
                setTimeout(() => {
                    togglePasswordChange();
                }, 1500);
            } else {
                showAlert(result.message || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে', 'error');
            }
        })
        .catch(error => {
            console.error('Password change error:', error);
            showAlert('পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে', 'error');
        })
        .finally(() => {
            btn.disabled = false;
            btn.classList.remove('btn-loading');
            btn.textContent = originalText;
            e.target.reset();
        }, 1500);
    }
}

const candidateData = {
    1: {
        name: "ওসমান হাদি",
        party: "স্বতন্ত্র প্রার্থী",
        symbol: "assets/images/powerful-symbol-unity-anti-corruption-day_968957-12635.avif",
        photo: "assets/images/WhatsApp Image 2025-12-27 at 11.35.15 PM.jpeg",
        bio: "ওসমান হাদি একজন সমাজসেবক ও রাজনীতিবিদ। তিনি দীর্ঘ দুই দশক ধরে ঢাকা-৮ আসনের মানুষের কল্যাণে কাজ করে যাচ্ছেন। দুর্নীতিমুক্ত সমাজ গড়ার প্রত্যয়ে তিনি এবার স্বতন্ত্র প্রার্থী হিসেবে নির্বাচনে অংশগ্রহণ করছেন।",
        manifesto: [
            "দুর্নীতিমুক্ত প্রশাসনিক ব্যবস্থা নিশ্চিত করা",
            "যুব সমাজের জন্য কর্মসংস্থান সৃষ্টি",
            "আধুনিক বর্জ্য ব্যবস্থাপনা ও পরিচ্ছন্ন এলাকা"
        ],
        socialActivities: [
            "প্রতিষ্ঠাতা, সবুজ বাংলা ফাউন্ডেশন",
            "প্রধান উপদেষ্টা, এলাকা উন্নয়ন কমিটি"
        ],
        partyHistory: "স্বতন্ত্র প্রার্থী হিসেবে তিনি কোনো নির্দিষ্ট রাজনৈতিক দলের অন্তর্ভুক্ত নন, তবে তিনি মুক্তিযুদ্ধের চেতনায় বিশ্বাসী এবং সর্বস্তরের মানুষের অধিকার আদায়ে সোচ্চার।"
    },
    2: {
        name: "হাসনাত আবদুল্লাহ",
        party: "ন্যাশনাল সিটিজেন পার্টি (এনসিপি)",
        symbol: "assets/images/জাতীয়_নাগরিক_পার্টির_লোগো.svg.png",
        photo: "assets/images/hasnat.jpg",
        bio: "হাসনাত আবদুল্লাহ বৈষম্যবিরোধী ছাত্র আন্দোলনের অন্যতম সমন্বয়ক এবং তরুণ রাজনৈতিক ব্যক্তিত্ব। তিনি রাষ্ট্র সংস্কার এবং নতুন রাজনৈতিক বন্দোবস্তের লক্ষ্যে কাজ করছেন। ছাত্র-জনতার অভ্যুত্থানে তার নেতৃত্ব তাকে জাতীয় পরিচিতি এনে দিয়েছে।",
        manifesto: [
            "রাষ্ট্রীয় কাঠামোর আমূল সংস্কার",
            "শিক্ষা ও স্বাস্থ্যখাতে বাজেট বৃদ্ধি",
            "নাগরিক অধিকার ও বাকস্বাধীনতা নিশ্চিত করা"
        ],
        socialActivities: [
            "সমন্বয়ক, বৈষম্যবিরোধী ছাত্র আন্দোলন",
            "স্বেচ্ছাসেবী, বন্যার্তদের সহায়তা কার্যক্রম"
        ],
        partyHistory: "ন্যাশনাল সিটিজেন পার্টি (এনসিপি) একটি নতুন প্রজন্মের রাজনৈতিক দল যা ২০২৪ সালের ছাত্র-জনতার অভ্যুত্থানের পরবর্তী সময়ে গঠিত হয়। দলটি সাম্য, মানবিক মর্যাদা এবং সামাজিক সুবিচার প্রতিষ্ঠার লক্ষ্যে কাজ করছে।"
    }
};

// viewCandidateDetails moved to admin-candidates.js
// Old mock version completely removed

function closeCandidateModal() {
    const modal = document.getElementById('candidateModal');
    modal.style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('candidateModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}


function resolveComplaint(complaintId) {
    const btn = event?.target;
    if (!btn) return;
    
    // Get the textarea from the closest complaint item
    const complaintItem = btn.closest('.complaint-item');
    const textarea = complaintItem?.querySelector('textarea');
    
    // Validate textarea is not empty
    if (!textarea || !textarea.value.trim()) {
        showAlert('অনুগ্রহ করে প্রশাসক মন্তব্য লিখুন', 'error');
        return;
    }
    
    // Show loading state
    btn.disabled = true;
    btn.classList.add('btn-loading');
    const originalText = btn.textContent;
    btn.textContent = 'সমাধান হচ্ছে...';
    
    setTimeout(() => {
        // Update complaint status in mock data
        const complaint = mockDashboardData.complaints.find(c => c.id === complaintId);
        if (complaint) {
            complaint.status = 'resolved';
        }
        
        // Reload complaints
        loadComplaintsData();
        
        // Show success message
        showAlert('অভিযোগ সফলভাবে সমাধান করা হয়েছে', 'success');
        
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = originalText;
    }, 1500);
}

// ===== ADMIN MANAGEMENT FUNCTIONS =====

// Load admin profile and check if superadmin
async function loadAdminProfile() {
    try {
        const adminData = sessionStorage.getItem('nirapodh_admin_user');
        if (!adminData) return;
        
        const admin = JSON.parse(adminData);
        
        // Display admin info
        const adminInfoContainer = document.getElementById('admin-info-container');
        if (adminInfoContainer) {
            adminInfoContainer.innerHTML = `
                <div class="info-item">
                    <span class="info-label">ইউজারনেম:</span>
                    <span class="info-value">${admin.username || 'N/A'}</span>
                </div>
                <div class="info-item">
                    <span class="info-label">পদবি:</span>
                    <span class="info-value">${admin.role === 'superadmin' ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}</span>
                </div>
            `;
        }
        
        // Show create admin section only for superadmin
        if (admin.role === 'superadmin') {
            const createAdminCard = document.getElementById('createAdminCard');
            const adminListCard = document.getElementById('adminListCard');
            const chatMenuItem = document.getElementById('chat-menu-item');
            
            if (createAdminCard) createAdminCard.style.display = 'block';
            if (adminListCard) adminListCard.style.display = 'block';
            if (chatMenuItem) chatMenuItem.style.display = 'flex';
            
            // Load admin list
            loadAdminList();
            
            // Add event listener to create admin form
            const createAdminForm = document.getElementById('createAdminForm');
            if (createAdminForm) {
                createAdminForm.addEventListener('submit', handleCreateAdmin);
            }
        }
    } catch (error) {
        console.error('Error loading admin profile:', error);
    }
}

// Create new admin (superadmin only)
async function handleCreateAdmin(e) {
    e.preventDefault();
    
    const username = document.getElementById('newAdminUsername').value.trim();
    const email = document.getElementById('newAdminEmail').value.trim();
    const initialPassword = document.getElementById('newAdminPassword').value;
    
    if (!username || !email || !initialPassword) {
        showAlert('সকল তথ্য প্রদান করুন', 'error');
        return;
    }
    
    if (initialPassword.length < 6) {
        showAlert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error');
        return;
    }
    
    const btn = document.getElementById('createAdminBtn');
    btn.disabled = true;
    btn.textContent = 'তৈরি হচ্ছে...';
    
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const url = `${API_CONFIG.API_URL}/admin/create-admin`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ username, email, initialPassword })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('নতুন প্রশাসক সফলভাবে তৈরি হয়েছে এবং ইমেইল পাঠানো হয়েছে', 'success');
            document.getElementById('createAdminForm').reset();
            loadAdminList(); // Reload admin list
        } else {
            showAlert(data.message || 'প্রশাসক তৈরি করতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Create admin error:', error);
        showAlert('সার্ভার ত্রুটি হয়েছে', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'প্রশাসক তৈরি করুন';
    }
}

// Load admin list (superadmin only)
async function loadAdminList() {
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const url = `${API_CONFIG.API_URL}/admin/admins`;
        
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            const adminListContainer = document.getElementById('adminListContainer');
            if (!adminListContainer) return;
            
            if (data.admins.length === 0) {
                adminListContainer.innerHTML = '<p class="text-muted">কোন প্রশাসক পাওয়া যায়নি</p>';
                return;
            }
            
            adminListContainer.innerHTML = data.admins.map(admin => `
                <div class="admin-list-item">
                    <div class="admin-info">
                        <div class="admin-icon">
                            <svg viewBox="0 0 24 24" fill="currentColor" width="20" height="20">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                        </div>
                        <div class="admin-details">
                            <strong>${admin.username}</strong>
                            <small>${admin.email}</small>
                            <span class="badge ${admin.role === 'superadmin' ? 'badge-success' : 'badge-primary'}">
                                ${admin.role === 'superadmin' ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}
                            </span>
                        </div>
                    </div>
                    <div class="admin-date">
                        <small>তৈরি: ${new Date(admin.createdAt).toLocaleDateString('bn-BD')}</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading admin list:', error);
    }
}

// ===== ADMIN MANAGEMENT FUNCTIONS =====

// Show/hide create admin section based on user role
async function checkAdminRole() {
    try {
        const adminData = JSON.parse(sessionStorage.getItem('nirapodh_admin_user') || '{}');
        
        if (adminData.role === 'superadmin') {
            // Show create admin card for superadmin
            const createAdminCard = document.getElementById('createAdminCard');
            const adminListCard = document.getElementById('adminListCard');
            
            if (createAdminCard) createAdminCard.style.display = 'block';
            if (adminListCard) adminListCard.style.display = 'block';
            
            // Load admin list
            await loadAdminList();
        }
    } catch (error) {
        console.error('Error checking admin role:', error);
    }
}

// Handle create admin form submission
async function handleCreateAdmin(e) {
    e.preventDefault();
    
    const username = document.getElementById('newAdminUsername').value.trim();
    const email = document.getElementById('newAdminEmail').value.trim();
    const password = document.getElementById('newAdminPassword').value;
    
    if (!username || !email || !password) {
        showAlert('সকল তথ্য প্রদান করুন', 'error');
        return;
    }
    
    const submitBtn = document.getElementById('createAdminBtn');
    submitBtn.disabled = true;
    submitBtn.textContent = 'তৈরি হচ্ছে...';
    
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const url = `${API_CONFIG.API_URL}/admin/create-admin`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                username,
                email,
                initialPassword: password
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('নতুন প্রশাসক সফলভাবে তৈরি হয়েছে এবং ইমেইল পাঠানো হয়েছে', 'success', 4000);
            
            // Reset form
            document.getElementById('createAdminForm').reset();
            
            // Reload admin list
            await loadAdminList();
        } else {
            showAlert(data.message || 'প্রশাসক তৈরি করতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Error creating admin:', error);
        showAlert('সার্ভার ত্রুটি হয়েছে', 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'প্রশাসক তৈরি করুন';
    }
}

// Load admin list (superadmin only)
async function loadAdminList() {
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const url = `${API_CONFIG.API_URL}/admin/admins`;
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        
        const data = await response.json();
        
        if (data.success && data.admins) {
            const container = document.getElementById('adminListContainer');
            if (!container) return;
            
            container.innerHTML = data.admins.map(admin => `
                <div class="admin-item">
                    <div class="admin-info">
                        <div class="admin-name">
                            <strong>${admin.username}</strong>
                            <span class="badge ${admin.role === 'superadmin' ? 'badge-success' : 'badge-primary'}">
                                ${admin.role === 'superadmin' ? 'সুপার অ্যাডমিন' : 'অ্যাডমিন'}
                            </span>
                        </div>
                        <div class="admin-email">
                            <small>${admin.email || 'ইমেইল নেই'}</small>
                        </div>
                    </div>
                    <div class="admin-date">
                        <small>তৈরি: ${new Date(admin.createdAt).toLocaleDateString('bn-BD')}</small>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading admin list:', error);
    }
}

function logout() {
    sessionStorage.removeItem('nirapodh_admin_token');
    sessionStorage.removeItem('nirapodh_admin_user');
    window.location.href = 'admin-login.html';
}

function rejectComplaint(complaintId) {
    const btn = event?.target;
    if (!btn) return;
    
    // Get the textarea from the closest complaint item
    const complaintItem = btn.closest('.complaint-item');
    const textarea = complaintItem?.querySelector('textarea');
    
    // Validate textarea is not empty
    if (!textarea || !textarea.value.trim()) {
        showAlert('অনুগ্রহ করে প্রশাসক মন্তব্য লিখুন', 'error');
        return;
    }
    
    // Show loading state
    btn.disabled = true;
    btn.classList.add('btn-loading');
    const originalText = btn.textContent;
    btn.textContent = 'প্রত্যাখ্যান হচ্ছে...';
    
    setTimeout(() => {
        // Update complaint status in mock data
        const complaint = mockDashboardData.complaints.find(c => c.id === complaintId);
        if (complaint) {
            complaint.status = 'rejected';
        }
        
        // Reload complaints
        loadComplaintsData();
        
        // Show success message
        showAlert('অভিযোগ সফলভাবে প্রত্যাখ্যান করা হয়েছে', 'success');
        
        btn.disabled = false;
        btn.classList.remove('btn-loading');
        btn.textContent = originalText;
    }, 1500);
}