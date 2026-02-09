// Citizen Complaints Management JavaScript

let currentComplaintsList = [];

// Get user data from sessionStorage
function getUserData() {
    const storedUser = sessionStorage.getItem('nirapodh_user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (e) {
            console.error('Error parsing user data:', e);
            return null;
        }
    }
    return null;
}

// Submit a new complaint
async function submitComplaint(event) {
    event.preventDefault();

    const complaintType = document.getElementById('complaintType').value;
    const description = document.getElementById('complaintDescription').value;
    const attachmentsInput = document.getElementById('complaintAttachments');
    const submitBtn = event.target.querySelector('button[type="submit"]');

    // Get citizen NID from sessionStorage
    const userData = getUserData();
    if (!userData || !userData.nid) {
        showAlert('লগইন তথ্য পাওয়া যাচ্ছে না। পুনরায় লগইন করুন।', 'error');
        return;
    }

    // Set loading state
    const originalText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.classList.add('btn-loading');
    submitBtn.innerHTML = `
        <span class="spinner"></span>
        <span>জমা দিচ্ছি...</span>
    `;

    try {
        // Create FormData for file upload
        const formData = new FormData();
        formData.append('nid', userData.nid);
        formData.append('complaintType', complaintType);
        formData.append('description', description);

        // Add attachments
        if (attachmentsInput.files.length > 0) {
            for (let i = 0; i < attachmentsInput.files.length; i++) {
                formData.append('attachments', attachmentsInput.files[i]);
            }
        }

        const response = await fetch(`${API_CONFIG.BASE_URL}/api/complaint/submit`, {
            method: 'POST',
            body: formData
        });

        const data = await response.json();

        if (data.success) {
            // Show success state briefly
            submitBtn.classList.remove('btn-loading');
            submitBtn.classList.add('btn-success');
            submitBtn.innerHTML = `
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style="width: 20px; height: 20px; display: inline-block; vertical-align: middle; margin-right: 5px;">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                </svg>
                <span>সফল!</span>
            `;
            
            setTimeout(() => {
                showAlert('অভিযোগ সফলভাবে জমা হয়েছে। আপনার অভিযোগ নম্বর: ' + data.complaint.complaintId, 'success');
                
                // Reset form
                document.getElementById('complaintForm').reset();
                
                // Reset button
                submitBtn.disabled = false;
                submitBtn.classList.remove('btn-success');
                submitBtn.innerHTML = originalText;
                
                // Reload complaints list
                loadMyComplaints();
            }, 1000);
        } else {
            // Reset button on error
            submitBtn.disabled = false;
            submitBtn.classList.remove('btn-loading');
            submitBtn.innerHTML = originalText;
            showAlert(data.message || 'অভিযোগ জমা দিতে সমস্যা হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Submit complaint error:', error);
        // Reset button on error
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-loading');
        submitBtn.innerHTML = originalText;
        showAlert('সার্ভারে সংযোগ সমস্যা হয়েছে', 'error');
    }
}

// Load citizen's complaints
async function loadMyComplaints() {
    const userData = getUserData();
    if (!userData || !userData.nid) {
        document.getElementById('myComplaintsList').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <p>লগইন তথ্য পাওয়া যাচ্ছে না</p>
            </div>
        `;
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/complaint/my-complaints/${userData.nid}`);
        const data = await response.json();

        if (data.success) {
            currentComplaintsList = data.complaints;
            displayComplaintsList(data.complaints);
        } else {
            document.getElementById('myComplaintsList').innerHTML = `
                <div style="text-align: center; padding: 20px; color: #666;">
                    <p>${data.message}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Load complaints error:', error);
        document.getElementById('myComplaintsList').innerHTML = `
            <div style="text-align: center; padding: 20px; color: #dc3545;">
                <p>অভিযোগ লোড করতে সমস্যা হয়েছে</p>
            </div>
        `;
    }
}

// Display complaints list
function displayComplaintsList(complaints) {
    const container = document.getElementById('myComplaintsList');

    if (!complaints || complaints.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 20px; color: #666;">
                <p>কোনো অভিযোগ পাওয়া যায়নি</p>
            </div>
        `;
        return;
    }

    let html = '';
    complaints.forEach(complaint => {
        const statusClass = getStatusClass(complaint.status);
        const statusIcon = getStatusIcon(complaint.status);
        const dateStr = formatBengaliDate(new Date(complaint.submittedAt));

        html += `
            <div class="complaint-item" onclick="viewComplaintDetails('${complaint.complaintId}')">
                <div class="complaint-header">
                    <div>
                        <span class="complaint-id">#${complaint.complaintId}</span>
                        <span class="complaint-status ${statusClass}">${statusIcon} ${complaint.status}</span>
                    </div>
                    <span class="complaint-date">${dateStr}</span>
                </div>
                <div class="complaint-type">${complaint.complaintType}</div>
                <p class="complaint-text">${truncateText(complaint.description, 100)}</p>
                ${complaint.adminResponse ? `
                    <div class="admin-reply-indicator">
                        <svg viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; margin-right: 5px;">
                            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
                        </svg>
                        প্রশাসক প্রতিক্রিয়া দিয়েছেন
                    </div>
                ` : ''}
            </div>
        `;
    });

    container.innerHTML = html;
}

// View complaint details in modal
async function viewComplaintDetails(complaintId) {
    try {
        const response = await fetch(`${API_CONFIG.BASE_URL}/api/complaint/complaint/${complaintId}`);
        const data = await response.json();

        if (data.success) {
            displayComplaintModal(data.complaint);
        } else {
            showAlert(data.message, 'error');
        }
    } catch (error) {
        console.error('Load complaint details error:', error);
        showAlert('অভিযোগের বিস্তারিত লোড করতে সমস্যা হয়েছে', 'error');
    }
}

// Display complaint details modal
function displayComplaintModal(complaint) {
    const statusClass = getStatusClass(complaint.status);
    const statusIcon = getStatusIcon(complaint.status);
    const dateStr = formatBengaliDate(new Date(complaint.submittedAt));

    let attachmentsHtml = '';
    if (complaint.attachments && complaint.attachments.length > 0) {
        attachmentsHtml = `
            <div style="margin-top: 15px;">
                <strong>সংযুক্ত ফাইল:</strong>
                <div style="margin-top: 8px;">
                    ${complaint.attachments.map(file => `
                        <a href="${API_CONFIG.BASE_URL}/api/complaint/download/${file.filename}" 
                           class="attachment-link" 
                           download="${file.originalName}"
                           style="display: inline-block; margin: 5px 10px 5px 0; padding: 8px 12px; background: #f0f0f0; border-radius: 4px; text-decoration: none; color: #333;">
                            📎 ${file.originalName}
                        </a>
                    `).join('')}
                </div>
            </div>
        `;
    }

    let adminResponseHtml = '';
    if (complaint.adminResponse) {
        const responseDate = formatBengaliDate(new Date(complaint.adminResponse.respondedAt));
        
        let adminAttachmentsHtml = '';
        if (complaint.adminResponse.attachments && complaint.adminResponse.attachments.length > 0) {
            adminAttachmentsHtml = `
                <div style="margin-top: 10px;">
                    <strong>সংযুক্ত ডকুমেন্ট:</strong>
                    <div style="margin-top: 8px;">
                        ${complaint.adminResponse.attachments.map(file => `
                            <a href="${API_CONFIG.BASE_URL}/api/complaint/download/${file.filename}" 
                               class="attachment-link" 
                               download="${file.originalName}"
                               style="display: inline-block; margin: 5px 10px 5px 0; padding: 8px 12px; background: #e8f5e9; border-radius: 4px; text-decoration: none; color: #333;">
                                📄 ${file.originalName}
                            </a>
                        `).join('')}
                    </div>
                </div>
            `;
        }

        adminResponseHtml = `
            <div class="admin-reply" style="background: #f0f9ff; padding: 15px; border-radius: 8px; margin-top: 20px; border-left: 4px solid #0066cc;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong style="color: #0066cc; font-size: 16px;">প্রশাসকের প্রতিক্রিয়া</strong>
                    <small style="color: #666;">${responseDate}</small>
                </div>
                <p style="color: #333; line-height: 1.6; margin: 10px 0;">${complaint.adminResponse.message}</p>
                <small style="color: #666;">প্রতিক্রিয়া প্রদান করেছেন: ${complaint.adminResponse.respondedBy}</small>
                ${adminAttachmentsHtml}
            </div>
        `;
    }

    const modalBody = document.getElementById('complaintModalBody');
    modalBody.innerHTML = `
        <div style="padding: 10px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                <div>
                    <span style="font-weight: bold; color: #666;">অভিযোগ নম্বর:</span>
                    <span style="color: #0066cc;">#${complaint.complaintId}</span>
                </div>
                <span class="complaint-status ${statusClass}" style="padding: 6px 12px; border-radius: 4px; font-size: 14px;">
                    ${statusIcon} ${complaint.status}
                </span>
            </div>

            <div style="margin-bottom: 10px;">
                <span style="font-weight: bold; color: #666;">অভিযোগের ধরন:</span>
                <span>${complaint.complaintType}</span>
            </div>

            <div style="margin-bottom: 10px;">
                <span style="font-weight: bold; color: #666;">জমা দেওয়ার তারিখ:</span>
                <span>${dateStr}</span>
            </div>

            <div style="margin-bottom: 10px;">
                <span style="font-weight: bold; color: #666;">ভোটিং এলাকা:</span>
                <span>${complaint.votingArea}</span>
            </div>

            <div style="margin-top: 15px;">
                <strong style="color: #666;">অভিযোগের বিস্তারিত:</strong>
                <p style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin-top: 8px; line-height: 1.6;">
                    ${complaint.description}
                </p>
            </div>

            ${attachmentsHtml}
            ${adminResponseHtml}
        </div>
    `;

    document.getElementById('complaintModal').style.display = 'block';
}

// Close complaint modal
function closeComplaintModal() {
    document.getElementById('complaintModal').style.display = 'none';
}

// Helper functions
function getStatusClass(status) {
    const statusMap = {
        'প্রক্রিয়াধীন': 'pending',
        'উত্তর প্রদান': 'replied',
        'সমাধানকৃত': 'resolved',
        'প্রত্যাখ্যাত': 'rejected'
    };
    return statusMap[status] || 'pending';
}

function getStatusIcon(status) {
    const iconMap = {
        'প্রক্রিয়াধীন': '⏳',
        'উত্তর প্রদান': '💬',
        'সমাধানকৃত': '✅',
        'প্রত্যাখ্যাত': '❌'
    };
    return iconMap[status] || '⏳';
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

// Load complaints when complaints section is active
let autoRefreshInterval = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the complaints section
    const complaintsSection = document.getElementById('complaints-section');
    if (complaintsSection) {
        // Load immediately if section is already active
        if (complaintsSection.classList.contains('active')) {
            loadMyComplaints();
            startAutoRefresh();
        }

        // Add observer for when the section becomes visible
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.target.classList.contains('active')) {
                    loadMyComplaints();
                    startAutoRefresh();
                } else {
                    stopAutoRefresh();
                }
            });
        });

        observer.observe(complaintsSection, {
            attributes: true,
            attributeFilter: ['class']
        });
    }
});

// Auto-refresh complaints every 30 seconds
function startAutoRefresh() {
    stopAutoRefresh(); // Clear any existing interval
    autoRefreshInterval = setInterval(() => {
        loadMyComplaints();
    }, 30000); // 30 seconds
}

function stopAutoRefresh() {
    if (autoRefreshInterval) {
        clearInterval(autoRefreshInterval);
        autoRefreshInterval = null;
    }
}

// Close modal when clicking outside
window.addEventListener('click', function(event) {
    const modal = document.getElementById('complaintModal');
    if (event.target === modal) {
        closeComplaintModal();
    }
});
