// Notice Management Functions
async function handleNoticeSubmit(event) {
    event.preventDefault();
    console.log('📝 Notice form submitted');

    const form = document.getElementById('noticeForm');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    try {
        submitBtn.disabled = true;
        submitBtn.classList.add('btn-loading');
        submitBtn.textContent = 'প্রকাশ করা হচ্ছে...';

        const title = document.getElementById('noticeTitle').value.trim();
        const type = document.getElementById('noticeType').value;
        const contentType = document.querySelector('input[name="contentType"]:checked').value;
        const message = document.getElementById('noticeMessage').value.trim();
        const pdfFile = document.getElementById('noticePdf').files[0];

        console.log('Form data:', { title, type, contentType, messageLength: message.length });

        // Validation
        if (!title || !type) {
            throw new Error('শিরোনাম এবং ধরন আবশ্যক');
        }

        if (contentType === 'text' && !message) {
            throw new Error('টেক্সট নোটিশের জন্য বার্তা আবশ্যক');
        }

        if (contentType === 'pdf' && !pdfFile) {
            throw new Error('PDF নোটিশের জন্য ফাইল আবশ্যক');
        }

        // Prepare form data
        const formData = new FormData();
        formData.append('title', title);
        formData.append('type', type);
        formData.append('contentType', contentType);

        if (contentType === 'text') {
            formData.append('message', message);
        } else {
            formData.append('pdfFile', pdfFile);
        }

        // Get admin token
        const token = sessionStorage.getItem('nirapodh_admin_token');
        if (!token) {
            throw new Error('অনুগ্রহ করে লগইন করুন');
        }

        console.log('Sending request to:', `${API_CONFIG.API_URL}/notice/create`);

        // Send to backend
        const response = await fetch(`${API_CONFIG.API_URL}/notice/create`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });

        console.log('Response status:', response.status);

        const data = await response.json();
        console.log('Response data:', data);

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'নোটিশ প্রকাশ করতে সমস্যা হয়েছে');
        }

        // Use alert if showSuccessMessage doesn't exist
        if (typeof showSuccessMessage === 'function') {
            showSuccessMessage('নোটিশ সফলভাবে প্রকাশিত হয়েছে');
        } else {
            alert('✅ নোটিশ সফলভাবে প্রকাশিত হয়েছে');
        }
        
        form.reset();
        
        // Reset to text mode
        document.querySelector('input[name="contentType"][value="text"]').checked = true;
        toggleNoticeContent('text');

        // Reload notices
        await loadPublishedNotices();

    } catch (error) {
        console.error('Notice submission error:', error);
        
        // Use alert if showErrorMessage doesn't exist
        if (typeof showErrorMessage === 'function') {
            showErrorMessage(error.message);
        } else {
            alert('❌ ' + error.message);
        }
    } finally {
        submitBtn.disabled = false;
        submitBtn.classList.remove('btn-loading');
        submitBtn.textContent = originalText;
    }
}

// Load published notices from backend
async function loadPublishedNotices() {
    const noticeList = document.querySelector('.notice-list');
    
    try {
        noticeList.innerHTML = '<p style="text-align: center; color: #999;">লোড হচ্ছে...</p>';

        const response = await fetch(`${API_CONFIG.API_URL}/notice/all`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'নোটিশ লোড করতে সমস্যা হয়েছে');
        }

        const notices = data.notices || [];

        if (notices.length === 0) {
            noticeList.innerHTML = '<p style="text-align: center; color: #999;">কোন নোটিশ প্রকাশিত হয়নি</p>';
            return;
        }

        let html = '';
        notices.forEach(notice => {
            html += renderNoticeItem(notice);
        });

        noticeList.innerHTML = html;

    } catch (error) {
        console.error('Load notices error:', error);
        noticeList.innerHTML = '<p style="text-align: center; color: #f44336;">নোটিশ লোড করতে সমস্যা হয়েছে</p>';
    }
}

// Render single notice item
function renderNoticeItem(notice) {
    const badgeClass = `badge-${getNoticeBadgeType(notice.type)}`;
    const preview = notice.contentType === 'text' 
        ? (notice.message ? notice.message.substring(0, 100) + '...' : 'বার্তা নেই')
        : 'PDF ফাইল';
    
    const date = new Date(notice.createdAt).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
        <div class="notice-item" data-notice-id="${notice._id}">
            <div class="notice-header">
                <h4>${notice.title}</h4>
                <span class="badge ${badgeClass}">${notice.type}</span>
            </div>
            <p class="notice-preview">${preview}</p>
            <div class="notice-meta">
                <span>📅 ${date}</span>
                <span>👤 ${notice.publishedByName}</span>
            </div>
            <div class="notice-actions">
                ${notice.contentType === 'pdf' ? 
                    `<button onclick="viewNoticePDF('${notice.pdfUrl}')" class="btn btn-sm btn-secondary">
                        <i class="fas fa-file-pdf"></i> PDF দেখুন
                    </button>` : ''}
                <button onclick="toggleNoticeStatus('${notice._id}', ${notice.isActive})" 
                        class="btn btn-sm ${notice.isActive ? 'btn-warning' : 'btn-success'}">
                    <i class="fas fa-${notice.isActive ? 'eye-slash' : 'eye'}"></i> 
                    ${notice.isActive ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করুন
                </button>
                <button onclick="deleteNotice('${notice._id}')" class="btn btn-sm btn-danger">
                    <i class="fas fa-trash"></i> মুছুন
                </button>
            </div>
        </div>
    `;
}

// Get badge type from notice type
function getNoticeBadgeType(type) {
    const typeMap = {
        'জরুরি': 'urgent',
        'নির্বাচন সংক্রান্ত': 'election',
        'প্রার্থী তালিকা': 'candidate',
        'ফলাফল': 'result',
        'সতর্কতা': 'warning',
        'সাধারণ': 'general'
    };
    return typeMap[type] || 'general';
}

// View PDF notice
function viewNoticePDF(pdfUrl) {
    window.open(API_CONFIG.API_URL + pdfUrl, '_blank');
}

// Toggle notice active status
async function toggleNoticeStatus(noticeId, currentStatus) {
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showErrorMessage('অনুগ্রহ করে লগইন করুন');
        return;
    }

    if (!confirm(`এই নোটিশটি ${currentStatus ? 'নিষ্ক্রিয়' : 'সক্রিয়'} করতে চান?`)) {
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/notice/${noticeId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে');
        }

        showSuccessMessage(data.message);
        await loadPublishedNotices();

    } catch (error) {
        console.error('Toggle notice error:', error);
        showErrorMessage(error.message);
    }
}

// Delete notice
async function deleteNotice(noticeId) {
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showErrorMessage('অনুগ্রহ করে লগইন করুন');
        return;
    }

    if (!confirm('এই নোটিশটি মুছে ফেলতে চান? এটি পুনরুদ্ধার করা যাবে না।')) {
        return;
    }

    try {
        const response = await fetch(`${API_CONFIG.API_URL}/notice/${noticeId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'নোটিশ মুছতে সমস্যা হয়েছে');
        }

        showSuccessMessage(data.message);
        await loadPublishedNotices();

    } catch (error) {
        console.error('Delete notice error:', error);
        showErrorMessage(error.message);
    }
}

// Toggle notice content type (text/pdf)
function toggleNoticeContent(type) {
    const textContent = document.getElementById('textContent');
    const pdfContent = document.getElementById('pdfContent');
    const messageField = document.getElementById('noticeMessage');
    const pdfField = document.getElementById('noticePdf');

    if (type === 'text') {
        textContent.classList.remove('hidden');
        pdfContent.classList.add('hidden');
        messageField.required = true;
        pdfField.required = false;
    } else {
        textContent.classList.add('hidden');
        pdfContent.classList.remove('hidden');
        messageField.required = false;
        pdfField.required = true;
    }
}

// Initialize notice form
function initializeNoticeForm() {
    const noticeForm = document.getElementById('noticeForm');
    if (noticeForm) {
        noticeForm.addEventListener('submit', handleNoticeSubmit);
        
        // Load published notices on page load
        if (document.getElementById('notice-section')) {
            loadPublishedNotices();
        }
    }
}

// Call initialization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    initializeNoticeForm();
});
