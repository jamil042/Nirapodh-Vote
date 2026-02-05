// Admin Complaints Management JavaScript

let allComplaintsData = [];
let currentViewingComplaint = null;

// Load all complaints
async function loadAllComplaints() {
    console.log('Loading complaints...'); // Debug
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/complaint/admin/all`);
        const data = await response.json();
        console.log('Complaints data:', data); // Debug

        if (data.success) {
            allComplaintsData = data.complaints;
            updateComplaintStats(data.stats);
            displayComplaintsList(data.complaints);
        } else {
            document.getElementById('complaints-list-container').innerHTML = `
                <div style="text-align: center; padding: 40px; color: #dc3545;">
                    <p>${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load complaints error:', error);
        document.getElementById('complaints-list-container').innerHTML = `
            <div style="text-align: center; padding: 40px; color: #dc3545;">
                <p>অভিযোগ লোড করতে সমস্যা হয়েছে</p>
                <p style="font-size: 14px; color: #666; margin-top: 10px;">Error: ${error.message}</p>
            </div>
        `;
    }
}

// Update statistics
function updateComplaintStats(stats) {
    document.getElementById('totalComplaints').textContent = toBengaliNumber(stats.total);
    document.getElementById('processingComplaints').textContent = toBengaliNumber(stats.processing);
    document.getElementById('answeredComplaints').textContent = toBengaliNumber(stats.answered);
    document.getElementById('resolvedComplaints').textContent = toBengaliNumber(stats.resolved);
}

// Display complaints list
function displayComplaintsList(complaints) {
    const container = document.getElementById('complaints-list-container');

    if (!complaints || complaints.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <svg viewBox="0 0 24 24" fill="currentColor" style="width: 64px; height: 64px; opacity: 0.3; margin-bottom: 15px;">
                    <path d="M19 3h-4.18C14.4 1.84 13.3 1 12 1c-1.3 0-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1z"/>
                </svg>
                <p>কোনো অভিযোগ পাওয়া যায়নি</p>
            </div>
        `;
        return;
    }

    let html = '<div style="display: grid; gap: 15px;">';
    
    complaints.forEach(complaint => {
        const statusClass = getComplaintStatusClass(complaint.status);
        const priorityClass = getPriorityClass(complaint.priority);
        const dateStr = formatBengaliDate(new Date(complaint.submittedAt));
        const hasResponse = complaint.adminResponse && complaint.adminResponse.message;

        html += `
            <div class="admin-complaint-card" onclick="viewAdminComplaintDetails('${complaint.complaintId}')" style="background: white; border: 2px solid #e0e0e0; border-radius: 8px; padding: 20px; cursor: pointer; transition: all 0.3s ease;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 12px; flex-wrap: wrap; gap: 10px;">
                    <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
                        <span style="font-weight: 700; color: #0066cc; font-size: 15px;">#${complaint.complaintId}</span>
                        <span class="badge ${statusClass}" style="padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${complaint.status}</span>
                        <span class="badge ${priorityClass}" style="padding: 4px 10px; border-radius: 12px; font-size: 12px; font-weight: 600;">${complaint.priority}</span>
                    </div>
                    <span style="color: #666; font-size: 13px;">${dateStr}</span>
                </div>

                <div style="margin-bottom: 10px;">
                    <div style="display: inline-block; background: #f0f0f0; color: #333; padding: 4px 10px; border-radius: 4px; font-size: 13px; margin-bottom: 8px;">
                        ${complaint.complaintType}
                    </div>
                </div>

                <div style="margin-bottom: 12px;">
                    <strong style="color: #666; font-size: 13px;">নাগরিক:</strong>
                    <span style="color: #333;">${complaint.citizenName}</span>
                    <span style="color: #999; margin-left: 10px; font-size: 13px;">NID: ****${complaint.citizenNID.slice(-4)}</span>
                    <span style="color: #999; margin-left: 10px; font-size: 13px;">📍 ${complaint.votingArea}</span>
                </div>

                <p style="color: #555; margin: 10px 0; line-height: 1.5; font-size: 14px;">
                    ${truncateText(complaint.description, 150)}
                </p>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                    <div style="display: flex; gap: 15px; font-size: 13px; color: #666;">
                        ${complaint.attachments && complaint.attachments.length > 0 ? `
                            <span>📎 ${toBengaliNumber(complaint.attachments.length)} ফাইল</span>
                        ` : ''}
                        ${hasResponse ? `
                            <span style="color: #4caf50; font-weight: 600;">✓ প্রতিক্রিয়া প্রদান করা হয়েছে</span>
                        ` : ''}
                    </div>
                    <button class="btn btn-sm" style="padding: 6px 16px; font-size: 13px;" onclick="event.stopPropagation(); viewAdminComplaintDetails('${complaint.complaintId}')">
                        বিস্তারিত দেখুন →
                    </button>
                </div>
            </div>
        `;
    });

    html += '</div>';
    container.innerHTML = html;
}

// Filter complaints
function filterComplaints() {
    const statusFilter = document.getElementById('statusFilter').value;
    const priorityFilter = document.getElementById('priorityFilter').value;
    const searchFilter = document.getElementById('searchFilter').value.toLowerCase();

    let filtered = allComplaintsData.filter(complaint => {
        const matchStatus = !statusFilter || complaint.status === statusFilter;
        const matchPriority = !priorityFilter || complaint.priority === priorityFilter;
        const matchSearch = !searchFilter || 
            complaint.complaintId.toLowerCase().includes(searchFilter) ||
            complaint.citizenName.toLowerCase().includes(searchFilter) ||
            complaint.citizenNID.includes(searchFilter) ||
            complaint.description.toLowerCase().includes(searchFilter);

        return matchStatus && matchPriority && matchSearch;
    });

    displayComplaintsList(filtered);
}

// View complaint details in modal
async function viewAdminComplaintDetails(complaintId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/complaint/complaint/${complaintId}`);
        const data = await response.json();

        if (data.success) {
            currentViewingComplaint = data.complaint;
            displayAdminComplaintModal(data.complaint);
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Load complaint details error:', error);
        showAlert('অভিযোগের বিস্তারিত লোড করতে সমস্যা হয়েছে', 'error');
    }
}

// Display admin complaint modal
function displayAdminComplaintModal(complaint) {
    const statusClass = getComplaintStatusClass(complaint.status);
    const priorityClass = getPriorityClass(complaint.priority);
    const dateStr = formatBengaliDate(new Date(complaint.submittedAt));

    let attachmentsHtml = '';
    if (complaint.attachments && complaint.attachments.length > 0) {
        attachmentsHtml = `
            <div style="margin-top: 20px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
                <strong style="color: #666;">নাগরিক কর্তৃক সংযুক্ত ফাইল:</strong>
                <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px;">
                    ${complaint.attachments.map(file => `
                        <a href="${API_CONFIG.BASE_URL}/api/complaint/download/${file.filename}" 
                           class="attachment-link" 
                           download="${file.originalName}"
                           style="display: inline-flex; align-items: center; padding: 10px 15px; background: white; border: 1px solid #ddd; border-radius: 6px; text-decoration: none; color: #333; transition: all 0.2s;">
                            <span style="margin-right: 8px;">📎</span>
                            <span>${file.originalName}</span>
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let adminResponseSection = '';
    if (complaint.adminResponse && complaint.adminResponse.message) {
        const responseDate = formatBengaliDate(new Date(complaint.adminResponse.respondedAt));
        
        let adminAttachmentsHtml = '';
        if (complaint.adminResponse.attachments && complaint.adminResponse.attachments.length > 0) {
            adminAttachmentsHtml = `
                <div style="margin-top: 15px;">
                    <strong style="color: #0066cc;">সংযুক্ত ডকুমেন্ট:</strong>
                    <div style="margin-top: 10px; display: flex; flex-wrap: wrap; gap: 10px;">
                        ${complaint.adminResponse.attachments.map(file => `
                            <a href="${API_CONFIG.BASE_URL}/api/complaint/download/${file.filename}" 
                               class="attachment-link" 
                               download="${file.originalName}"
                               style="display: inline-flex; align-items: center; padding: 10px 15px; background: #e8f5e9; border: 1px solid #c8e6c9; border-radius: 6px; text-decoration: none; color: #333;">
                                <span style="margin-right: 8px;">📄</span>
                                <span>${file.originalName}</span>
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        adminResponseSection = `
            <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin-top: 25px; border-left: 4px solid #2196f3;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                    <strong style="color: #1976d2; font-size: 16px;">আপনার প্রতিক্রিয়া</strong>
                    <small style="color: #666;">${responseDate}</small>
                </div>
                <p style="color: #333; line-height: 1.6; margin: 10px 0;">${complaint.adminResponse.message}</p>
                <small style="color: #666;">প্রতিক্রিয়া প্রদান করেছেন: ${complaint.adminResponse.respondedBy}</small>
                ${adminAttachmentsHtml}
            </div>
        `;
    }

    const adminInfo = JSON.parse(localStorage.getItem('adminData') || sessionStorage.getItem('adminData'));
    const adminName = adminInfo ? adminInfo.name : 'Admin';

    const modalBody = document.getElementById('adminComplaintModalBody');
    modalBody.innerHTML = `
        <div style="padding: 10px;">
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 20px;">
                <div>
                    <strong style="color: #666; font-size: 13px;">অভিযোগ নম্বর</strong>
                    <div style="color: #0066cc; font-weight: 600; font-size: 16px; margin-top: 4px;">#${complaint.complaintId}</div>
                </div>
                <div>
                    <strong style="color: #666; font-size: 13px;">স্ট্যাটাস</strong>
                    <div class="badge ${statusClass}" style="display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-top: 4px;">
                        ${complaint.status}
                    </div>
                </div>
                <div>
                    <strong style="color: #666; font-size: 13px;">প্রায়োরিটি</strong>
                    <div class="badge ${priorityClass}" style="display: inline-block; padding: 6px 12px; border-radius: 12px; font-size: 14px; font-weight: 600; margin-top: 4px;">
                        ${complaint.priority}
                    </div>
                </div>
                <div>
                    <strong style="color: #666; font-size: 13px;">জমা দেওয়ার তারিখ</strong>
                    <div style="color: #333; margin-top: 4px;">${dateStr}</div>
                </div>
            </div>

            <div style="background: #f5f5f5; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <strong style="color: #666; font-size: 13px;">নাগরিক তথ্য</strong>
                <div style="margin-top: 8px;">
                    <div style="color: #333; font-weight: 600;">${complaint.citizenName}</div>
                    <div style="color: #666; font-size: 14px; margin-top: 4px;">
                        NID: ${complaint.citizenNID} | ভোটিং এলাকা: ${complaint.votingArea}
                    </div>
                </div>
            </div>

            <div style="margin-bottom: 15px;">
                <strong style="color: #666;">অভিযোগের ধরন:</strong>
                <span style="display: inline-block; background: #f0f0f0; color: #333; padding: 6px 12px; border-radius: 6px; margin-left: 10px;">
                    ${complaint.complaintType}
                </span>
            </div>

            <div style="margin-top: 20px;">
                <strong style="color: #666;">অভিযোগের বিস্তারিত:</strong>
                <div style="background: #fff; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px; margin-top: 10px; line-height: 1.8; color: #333;">
                    ${complaint.description}
                </div>
            </div>

            ${attachmentsHtml}
            ${adminResponseSection}

            <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e0e0e0;">
                <h3 style="color: #333; margin-bottom: 20px;">প্রতিক্রিয়া প্রদান করুন</h3>
                
                <form id="adminResponseForm" onsubmit="submitAdminResponse(event, '${complaint.complaintId}')">
                    <div style="margin-bottom: 20px;">
                        <label style="display: block; margin-bottom: 8px; color: #666; font-weight: 600;">স্ট্যাটাস পরিবর্তন করুন</label>
                        <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                            <select id="responseStatus" class="input-field" style="flex: 1; min-width: 200px;">
                                <option value="প্রক্রিয়াধীন" ${complaint.status === 'প্রক্রিয়াধীন' ? 'selected' : ''}>প্রক্রিয়াধীন</option>
                                <option value="উত্তর প্রদান" ${complaint.status === 'উত্তর প্রদান' ? 'selected' : ''}>উত্তর প্রদান</option>
                                <option value="সমাধানকৃত" ${complaint.status === 'সমাধানকৃত' ? 'selected' : ''}>সমাধানকৃত</option>
                                <option value="প্রত্যাখ্যাত" ${complaint.status === 'প্রত্যাখ্যাত' ? 'selected' : ''}>প্রত্যাখ্যাত</option>
                            </select>
                            <select id="responsePriority" class="input-field" style="flex: 1; min-width: 200px;">
                                <option value="সাধারণ" ${complaint.priority === 'সাধারণ' ? 'selected' : ''}>সাধারণ</option>
                                <option value="জরুরি" ${complaint.priority === 'জরুরি' ? 'selected' : ''}>জরুরি</option>
                                <option value="অত্যন্ত জরুরি" ${complaint.priority === 'অত্যন্ত জরুরি' ? 'selected' : ''}>অত্যন্ত জরুরি</option>
                            </select>
                        </div>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label for="responseMessage" style="display: block; margin-bottom: 8px; color: #666; font-weight: 600;">আপনার প্রতিক্রিয়া *</label>
                        <textarea id="responseMessage" rows="5" class="input-field" placeholder="নাগরিককে বিস্তারিত উত্তর প্রদান করুন..." required style="width: 100%; resize: vertical;">${complaint.adminResponse?.message || ''}</textarea>
                    </div>

                    <div style="margin-bottom: 20px;">
                        <label for="responseAttachments" style="display: block; margin-bottom: 8px; color: #666; font-weight: 600;">ডকুমেন্ট সংযুক্ত করুন (ঐচ্ছিক)</label>
                        <input type="file" id="responseAttachments" class="input-field" multiple accept="image/*,.pdf,.doc,.docx">
                        <small style="color: #999; display: block; margin-top: 5px;">সর্বোচ্চ ৫টি ফাইল, প্রতিটি ৫MB এর কম</small>
                    </div>

                    <div style="display: flex; gap: 10px; justify-content: flex-end;">
                        <button type="button" class="btn btn-secondary" onclick="closeAdminComplaintModal()">বাতিল</button>
                        <button type="submit" class="btn btn-primary">প্রতিক্রিয়া জমা দিন</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('adminComplaintModal').style.display = 'block';
}

// Submit admin response
async function submitAdminResponse(event, complaintId) {
    event.preventDefault();

    const message = document.getElementById('responseMessage').value;
    const status = document.getElementById('responseStatus').value;
    const priority = document.getElementById('responsePriority').value;
    const attachmentsInput = document.getElementById('responseAttachments');

    const adminInfo = JSON.parse(localStorage.getItem('adminData') || sessionStorage.getItem('adminData'));
    const respondedBy = adminInfo ? adminInfo.name : 'Admin';

    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('message', message);
        formData.append('respondedBy', respondedBy);
        formData.append('status', status);

        // Add attachments
        if (attachmentsInput.files.length > 0) {
            for (let i = 0; i < attachmentsInput.files.length; i++) {
                formData.append('attachments', attachmentsInput.files[i]);
            }
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/complaint/admin/respond/${complaintId}`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Update priority if changed
            if (currentViewingComplaint && currentViewingComplaint.priority !== priority) {
                await fetch(`${API_CONFIG.BASE_URL}/api/complaint/admin/update-status/${complaintId}`, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ priority })
                });
            }

            showAlert('প্রতিক্রিয়া সফলভাবে জমা হয়েছে', 'success');
            closeAdminComplaintModal();
            loadAllComplaints();
        } else {
            showAlert(data.message || 'প্রতিক্রিয়া জমা দিতে সমস্যা হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Submit response error:', error);
        showAlert('সার্ভারে সংযোগ সমস্যা হয়েছে', 'error');
    }
}

// Close admin complaint modal
function closeAdminComplaintModal() {
    document.getElementById('adminComplaintModal').style.display = 'none';
    currentViewingComplaint = null;
}

// Helper functions
function getComplaintStatusClass(status) {
    const statusMap = {
        'প্রক্রিয়াধীন': 'status-pending',
        'উত্তর প্রদান': 'status-replied',
        'সমাধানকৃত': 'status-resolved',
        'প্রত্যাখ্যাত': 'status-rejected'
    };
    return statusMap[status] || 'status-pending';
}

function getPriorityClass(priority) {
    const priorityMap = {
        'সাধারণ': 'priority-normal',
        'জরুরি': 'priority-urgent',
        'অত্যন্ত জরুরি': 'priority-critical'
    };
    return priorityMap[priority] || 'priority-normal';
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

function formatBengaliDate(date) {
    const bengaliMonths = [
        'জানুয়ারি', 'ফেব্রুয়ারি', 'মার্চ', 'এপ্রিল', 'মে', 'জুন',
        'জুলাই', 'আগস্ট', 'সেপ্টেম্বর', 'অক্টোবর', 'নভেম্বর', 'ডিসেম্বর'
    ];
    
    const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    
    const day = date.getDate().toString().split('').map(d => bengaliNumbers[d]).join('');
    const month = bengaliMonths[date.getMonth()];
    const year = date.getFullYear().toString().split('').map(d => bengaliNumbers[d]).join('');
    
    return `${day} ${month} ${year}`;
}

function toBengaliNumber(num) {
    const bengaliNumbers = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];
    return num.toString().split('').map(d => bengaliNumbers[d] || d).join('');
}

// Load complaints when complaints section is active
let adminAutoRefreshInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    const complaintsSection = document.getElementById('complaints-section');
    if (complaintsSection) {
        // Load immediately if section is already active
        if (complaintsSection.classList.contains('active')) {
            loadAllComplaints();
            startAdminAutoRefresh();
        }

        // Also observe for future changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    loadAllComplaints();
                    startAdminAutoRefresh();
                } else {
                    stopAdminAutoRefresh();
                }
            });
        });

        observer.observe(complaintsSection, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Auto-refresh admin complaints every 15 seconds
function startAdminAutoRefresh() {
    stopAdminAutoRefresh(); // Clear any existing interval
    adminAutoRefreshInterval = setInterval(() => {
        loadAllComplaints();
    }, 15000); // 15 seconds - faster for admin
}

function stopAdminAutoRefresh() {
    if (adminAutoRefreshInterval) {
        clearInterval(adminAutoRefreshInterval);
        adminAutoRefreshInterval = null;
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('adminComplaintModal');
    if (event.target === modal) {
        closeAdminComplaintModal();
    }
});
