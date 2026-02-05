// Admin Candidates Management
console.log('📋 Admin candidates script loaded');

// Store candidates data globally for real-time updates
let currentCandidatesData = [];

// Fallback functions if common.js doesn't have them
if (typeof showSuccessMessage === 'undefined') {
    window.showSuccessMessage = function(message) {
        if (typeof showAlert !== 'undefined') {
            showAlert(message, 'success');
        } else {
            alert(message);
        }
    };
}

if (typeof showErrorMessage === 'undefined') {
    window.showErrorMessage = function(message) {
        if (typeof showAlert !== 'undefined') {
            showAlert(message, 'error');
        } else {
            alert(message);
        }
    };
}

// Check voting status every 10 seconds and update buttons
setInterval(() => {
    if (currentCandidatesData.length > 0) {
        updateCandidateButtons();
    }
}, 10000); // Check every 10 seconds

// Update candidate action buttons based on voting start time
function updateCandidateButtons() {
    const now = new Date();
    
    currentCandidatesData.forEach(candidate => {
        if (candidate.ballot && candidate.ballot.startDate) {
            const votingStarted = new Date(candidate.ballot.startDate) <= now;
            
            // Find buttons by checking all edit/delete buttons in the table
            const allRows = document.querySelectorAll('#candidatesTableBody tr');
            allRows.forEach(row => {
                // Find buttons in this row
                const editBtn = row.querySelector('button[onclick*="editCandidate"]');
                const deleteBtn = row.querySelector('button[onclick*="deleteCandidate"]');
                
                // Check if this row is for our candidate by checking if button has candidate ID
                if (editBtn && editBtn.getAttribute('onclick').includes(candidate._id)) {
                    if (votingStarted && !editBtn.disabled) {
                        editBtn.disabled = true;
                        editBtn.style.opacity = '0.5';
                        editBtn.style.cursor = 'not-allowed';
                        editBtn.setAttribute('title', 'ভোট শুরু হয়ে গেছে। সম্পাদনা করা যাবে না।');
                        editBtn.removeAttribute('onclick');
                    }
                }
                
                if (deleteBtn && deleteBtn.getAttribute('onclick').includes(candidate._id)) {
                    if (votingStarted && !deleteBtn.disabled) {
                        deleteBtn.disabled = true;
                        deleteBtn.style.opacity = '0.5';
                        deleteBtn.style.cursor = 'not-allowed';
                        deleteBtn.setAttribute('title', 'ভোট শুরু হয়ে গেছে। মুছা যাবে না।');
                        deleteBtn.removeAttribute('onclick');
                    }
                }
            });
        }
    });
}

// Load all candidates for the table
async function loadCandidates() {
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        if (!token) {
            showErrorMessage('অনুগ্রহ করে লগইন করুন');
            return;
        }

        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            currentCandidatesData = data.candidates; // Store for real-time updates
            renderCandidatesTable(data.candidates);
        } else {
            showErrorMessage(data.message || 'প্রার্থী তালিকা লোড করতে ব্যর্থ হয়েছে');
        }
    } catch (error) {
        console.error('Load candidates error:', error);
        showErrorMessage('প্রার্থী তালিকা লোড করতে ত্রুটি হয়েছে');
    }
}

// Render candidates in table
function renderCandidatesTable(candidates) {
    const tbody = document.getElementById('candidatesTableBody');
    
    if (!candidates || candidates.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="text-align: center; padding: 30px; color: #666;">
                    কোনো প্রার্থী পাওয়া যায়নি
                </td>
            </tr>
        `;
        currentCandidatesData = []; // Clear stored data
        return;
    }

    tbody.innerHTML = candidates.map(candidate => {
        // Check if voting has started
        const now = new Date();
        let votingStarted = false;
        
        if (candidate.ballot && candidate.ballot.startDate) {
            const startDate = new Date(candidate.ballot.startDate);
            votingStarted = startDate <= now;
            
            // Debug log
            console.log('Candidate:', candidate.name, {
                startDate: startDate.toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' }),
                now: now.toLocaleString('bn-BD', { timeZone: 'Asia/Dhaka' }),
                votingStarted,
                startDateISO: startDate.toISOString(),
                nowISO: now.toISOString()
            });
        }
        
        const editDisabled = votingStarted ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
        const deleteDisabled = votingStarted ? 'disabled style="opacity: 0.5; cursor: not-allowed;"' : '';
        const editTitle = votingStarted ? 'ভোট শুরু হয়ে গেছে। সম্পাদনা করা যাবে না।' : 'সম্পাদনা করুন';
        const deleteTitle = votingStarted ? 'ভোট শুরু হয়ে গেছে। মুছা যাবে না।' : 'মুছে ফেলুন';
        
        return `
        <tr>
            <td>
                <img src="${candidate.image || 'assets/images/default-avatar.png'}" 
                     alt="${candidate.name}" 
                     style="width: 50px; height: 50px; border-radius: 50%; object-fit: cover;">
            </td>
            <td>${candidate.name}</td>
            <td>${candidate.party}</td>
            <td>
                ${candidate.symbol ? `
                    <img src="${candidate.symbol}" 
                         alt="প্রতীক" 
                         style="width: 40px; height: 40px; object-fit: contain;">
                ` : 'N/A'}
            </td>
            <td>${candidate.area}</td>
            <td>
                <span class="status-badge ${candidate.status === 'active' ? 'status-active' : 'status-inactive'}">
                    ${candidate.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                </span>
            </td>
            <td>
                <div style="display: flex; gap: 8px; justify-content: center;">
                    <button class="btn-icon" onclick="viewCandidateDetails('${candidate._id}')" title="বিস্তারিত দেখুন">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                            <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                    </button>
                    <button class="btn-icon btn-edit" ${editDisabled} onclick="${votingStarted ? '' : `editCandidate('${candidate._id}')`}" title="${editTitle}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                    </button>
                    <button class="btn-icon btn-delete" ${deleteDisabled} onclick="${votingStarted ? '' : `deleteCandidate('${candidate._id}')`}" title="${deleteTitle}">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// View candidate details in modal
async function viewCandidateDetails(candidateId) {
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        if (!token) {
            showErrorMessage('অনুগ্রহ করে লগইন করুন');
            return;
        }

        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates/${candidateId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showCandidateDetailsModal(data.candidate);
        } else {
            showErrorMessage(data.message || 'প্রার্থীর তথ্য লোড করতে ব্যর্থ হয়েছে');
        }
    } catch (error) {
        console.error('View candidate error:', error);
        showErrorMessage('প্রার্থীর তথ্য লোড করতে ত্রুটি হয়েছে');
    }
}

// Show candidate details modal
function showCandidateDetailsModal(candidate) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 800px;">
            <div class="modal-header">
                <h2>প্রার্থীর বিস্তারিত তথ্য</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                    <div style="text-align: center;">
                        <img src="${candidate.image || 'assets/images/default-avatar.png'}" 
                             alt="${candidate.name}" 
                             style="width: 150px; height: 150px; border-radius: 50%; object-fit: cover; margin-bottom: 10px;">
                        <h3 style="margin: 0;">${candidate.name}</h3>
                    </div>
                    <div style="text-align: center;">
                        ${candidate.symbol ? `
                            <img src="${candidate.symbol}" 
                                 alt="প্রতীক" 
                                 style="width: 150px; height: 150px; object-fit: contain; margin-bottom: 10px;">
                            <p style="margin: 0; color: #666;">নির্বাচনী প্রতীক</p>
                        ` : '<p style="color: #999;">কোনো প্রতীক নেই</p>'}
                    </div>
                </div>

                <div class="info-grid" style="display: grid; gap: 15px;">
                    <div class="info-item">
                        <strong>দলের নাম:</strong>
                        <span>${candidate.party}</span>
                    </div>
                    <div class="info-item">
                        <strong>ব্যালট নাম:</strong>
                        <span>${candidate.ballotName}</span>
                    </div>
                    <div class="info-item">
                        <strong>এলাকা:</strong>
                        <span>${candidate.area}</span>
                    </div>
                    <div class="info-item">
                        <strong>অবস্থা:</strong>
                        <span class="status-badge ${candidate.status === 'active' ? 'status-active' : 'status-inactive'}">
                            ${candidate.status === 'active' ? 'সক্রিয়' : 'নিষ্ক্রিয়'}
                        </span>
                    </div>
                    
                    ${candidate.bio ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <strong>জীবনী:</strong>
                        <p style="margin-top: 8px; line-height: 1.6; white-space: pre-wrap;">${candidate.bio}</p>
                    </div>
                    ` : ''}
                    
                    ${candidate.manifesto ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <strong>নির্বাচনী ইশতেহার:</strong>
                        <p style="margin-top: 8px; line-height: 1.6; white-space: pre-wrap;">${candidate.manifesto}</p>
                    </div>
                    ` : ''}
                    
                    ${candidate.socialWork ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <strong>সমাজসেবা:</strong>
                        <p style="margin-top: 8px; line-height: 1.6; white-space: pre-wrap;">${candidate.socialWork}</p>
                    </div>
                    ` : ''}
                    
                    ${candidate.partyHistory ? `
                    <div class="info-item" style="grid-column: 1 / -1;">
                        <strong>দলীয় ইতিহাস:</strong>
                        <p style="margin-top: 8px; line-height: 1.6; white-space: pre-wrap;">${candidate.partyHistory}</p>
                    </div>
                    ` : ''}
                </div>
            </div>
            <div class="modal-footer">
                <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">বন্ধ করুন</button>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); editCandidate('${candidate._id}');">সম্পাদনা করুন</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Edit candidate
async function editCandidate(candidateId) {
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        if (!token) {
            showErrorMessage('অনুগ্রহ করে লগইন করুন');
            return;
        }

        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates/${candidateId}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showEditCandidateModal(data.candidate);
        } else {
            showErrorMessage(data.message || 'প্রার্থীর তথ্য লোড করতে ব্যর্থ হয়েছে');
        }
    } catch (error) {
        console.error('Edit candidate error:', error);
        showErrorMessage('প্রার্থীর তথ্য লোড করতে ত্রুটি হয়েছে');
    }
}

// Show edit candidate modal
function showEditCandidateModal(candidate) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
        <div class="modal-container" style="max-width: 700px;">
            <div class="modal-header">
                <h2>প্রার্থীর তথ্য সম্পাদনা করুন</h2>
                <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">×</button>
            </div>
            <form id="editCandidateForm" onsubmit="handleUpdateCandidate(event, '${candidate._id}')">
                <div class="modal-body" style="max-height: 60vh; overflow-y: auto;">
                    <div class="form-group">
                        <label>নাম *</label>
                        <input type="text" name="name" value="${candidate.name}" required class="input-field">
                    </div>
                    
                    <div class="form-group">
                        <label>দলের নাম *</label>
                        <input type="text" name="party" value="${candidate.party}" required class="input-field">
                    </div>
                    
                    <div class="form-row">
                        <div class="form-group">
                            <label>ছবি (Base64 বা URL)</label>
                            <textarea name="image" class="input-field" rows="2">${candidate.image || ''}</textarea>
                        </div>
                        <div class="form-group">
                            <label>প্রতীক (Base64 বা URL)</label>
                            <textarea name="symbol" class="input-field" rows="2">${candidate.symbol || ''}</textarea>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label>জীবনী</label>
                        <textarea name="bio" class="input-field" rows="3">${candidate.bio || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>নির্বাচনী ইশতেহার</label>
                        <textarea name="manifesto" class="input-field" rows="3">${candidate.manifesto || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>সমাজসেবা</label>
                        <textarea name="socialWork" class="input-field" rows="3">${candidate.socialWork || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>দলীয় ইতিহাস</label>
                        <textarea name="partyHistory" class="input-field" rows="3">${candidate.partyHistory || ''}</textarea>
                    </div>
                    
                    <div class="form-group">
                        <label>অবস্থা</label>
                        <select name="status" class="input-field">
                            <option value="active" ${candidate.status === 'active' ? 'selected' : ''}>সক্রিয়</option>
                            <option value="inactive" ${candidate.status === 'inactive' ? 'selected' : ''}>নিষ্ক্রিয়</option>
                        </select>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">বাতিল করুন</button>
                    <button type="submit" class="btn btn-primary">আপডেট করুন</button>
                </div>
            </form>
        </div>
    `;
    
    document.body.appendChild(modal);
}

// Handle update candidate
async function handleUpdateCandidate(event, candidateId) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const updateData = {};
    
    // Collect form data
    for (let [key, value] of formData.entries()) {
        updateData[key] = value.trim();
    }
    
    console.log('Update data:', updateData);
    
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        if (!token) {
            showErrorMessage('অনুগ্রহ করে লগইন করুন');
            return;
        }

        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates/${candidateId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(updateData)
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccessMessage(data.message || 'প্রার্থীর তথ্য সফলভাবে আপডেট হয়েছে');
            
            // Close modal
            form.closest('.modal-overlay').remove();
            
            // Reload candidates table
            loadCandidates();
        } else {
            showErrorMessage(data.message || 'প্রার্থীর তথ্য আপডেট করতে ব্যর্থ হয়েছে');
        }
    } catch (error) {
        console.error('Update candidate error:', error);
        showErrorMessage('প্রার্থীর তথ্য আপডেট করতে ত্রুটি হয়েছে');
    }
}

// Delete candidate
async function deleteCandidate(candidateId) {
    if (!confirm('আপনি কি নিশ্চিত এই প্রার্থী মুছে ফেলতে চান?')) {
        return;
    }
    
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        if (!token) {
            showErrorMessage('অনুগ্রহ করে লগইন করুন');
            return;
        }

        const response = await fetch(`${API_CONFIG.API_URL}/admin/candidates/${candidateId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();
        
        if (data.success) {
            showSuccessMessage(data.message || 'প্রার্থী সফলভাবে মুছে ফেলা হয়েছে');
            loadCandidates();
        } else {
            showErrorMessage(data.message || 'প্রার্থী মুছে ফেলতে ব্যর্থ হয়েছে');
        }
    } catch (error) {
        console.error('Delete candidate error:', error);
        showErrorMessage('প্রার্থী মুছে ফেলতে ত্রুটি হয়েছে');
    }
}

// Initialize on page load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // Load candidates when switching to candidates section
        const candidatesNav = document.querySelector('[onclick*="candidates"]');
        if (candidatesNav) {
            candidatesNav.addEventListener('click', loadCandidates);
        }
    });
} else {
    // DOM already loaded
    const candidatesNav = document.querySelector('[onclick*="candidates"]');
    if (candidatesNav) {
        candidatesNav.addEventListener('click', loadCandidates);
    }
}
