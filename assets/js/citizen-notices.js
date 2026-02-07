// Citizen Notice Functions - Load notices from backend

async function loadCitizenNotices() {
    const noticesContainer = document.querySelector('.notices-container');
    
    try {
        noticesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">নোটিশ লোড হচ্ছে...</p>';

        const response = await fetch(`${API_CONFIG.API_URL}/notice/all`);
        const data = await response.json();

        if (!response.ok || !data.success) {
            throw new Error(data.message || 'নোটিশ লোড করতে সমস্যা হয়েছে');
        }

        const notices = data.notices || [];
        
        // Update total notice count for badge tracking
        totalNotices = notices.length;

        if (notices.length === 0) {
            noticesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">কোন নোটিশ উপলব্ধ নেই</p>';
            return;
        }

        let html = '';
        notices.forEach(notice => {
            html += renderCitizenNoticeCard(notice);
        });

        noticesContainer.innerHTML = html;
        
        // Mark notices as viewed when loading - clear badge immediately
        window.markNoticesAsViewed();

    } catch (error) {
        console.error('Load citizen notices error:', error);
        noticesContainer.innerHTML = '<p style="text-align: center; color: #f44336; padding: 20px;">নোটিশ লোড করতে সমস্যা হয়েছে</p>';
    }
}

function renderCitizenNoticeCard(notice) {
    // Determine notice styling based on type
    const noticeStyles = {
        'জরুরি': { class: 'important', badge: 'জরুরি', prefix: 'গুরুত্বপূর্ণ: ' },
        'ফলাফল': { class: 'important', badge: 'ফলাফল', prefix: '' },
        'নির্বাচন সংক্রান্ত': { class: 'election', badge: 'নির্বাচন', prefix: '' },
        'প্রার্থী তালিকা': { class: 'candidate', badge: 'প্রার্থী', prefix: '' },
        'সতর্কতা': { class: 'warning', badge: 'সতর্কতা', prefix: '' },
        'সাধারণ': { class: '', badge: 'সাধারণ', prefix: '' }
    };
    
    const style = noticeStyles[notice.type] || noticeStyles['সাধারণ'];
    
    const date = new Date(notice.createdAt).toLocaleDateString('bn-BD', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Build content - show message if exists, otherwise show PDF message
    let content = '';
    if (notice.message) {
        content = `<p>${notice.message}</p>`;
    } else if (notice.pdfUrl) {
        content = `<p>এই নোটিশের জন্য একটি PDF ফাইল উপলব্ধ আছে।</p>`;
    } else {
        content = `<p>বিষয়বস্তু নেই।</p>`;
    }

    // Show PDF button if PDF exists
    const pdfButton = notice.pdfUrl
        ? `<button class="btn btn-secondary btn-sm" onclick="viewCitizenNoticePDF('${notice.pdfUrl}')">
               <span>📄 PDF দেখুন</span>
           </button>`
        : '';

    return `
        <div class="notice-card ${style.class}">
            <div class="notice-header">
                <h3>${style.prefix}${notice.title}</h3>
                <span class="notice-badge notice-badge-${notice.type}">${style.badge}</span>
            </div>
            <div class="notice-date">${date}</div>
            ${content}
            ${pdfButton}
        </div>
    `;
}

function viewCitizenNoticePDF(pdfUrl) {
    // PDF URL is now a full URL from server, use it directly
    window.open(pdfUrl, '_blank');
}

// Notification Badge Management with Socket.IO
let totalNotices = 0;
let noticeSocket = null;

// Initialize Socket.IO connection for notices
function initNoticeSocket() {
    if (noticeSocket) return; // Already connected
    
    const socketUrl = API_CONFIG.API_URL.replace('/api', '');
    noticeSocket = io(socketUrl, {
        transports: ['websocket', 'polling']
    });
    
    // Listen for new notice events
    noticeSocket.on('new_notice', (data) => {
        console.log('🔔 New notice received:', data);
        showNewNoticeNotification();
    });
    
    noticeSocket.on('connect', () => {
        console.log('✅ Socket connected for notice notifications');
    });
    
    noticeSocket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
    });
}

// Show notification badge when new notice arrives
function showNewNoticeNotification() {
    const badge = document.getElementById('notificationBadge');
    if (!badge) return;
    
    const currentCount = parseInt(badge.textContent) || 0;
    badge.textContent = currentCount + 1;
    badge.style.display = 'inline-block';
    
    // Show alert
    if (typeof showAlert === 'function') {
        showAlert('নতুন নোটিশ এসেছে! নোটিশ সেকশনে দেখুন।', 'info');
    }
}

// Initialize badge count on first load
async function initBadgeCount() {
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/notice/all`);
        const data = await response.json();
        
        if (response.ok && data.success) {
            totalNotices = data.notices.length;
            
            const badge = document.getElementById('notificationBadge');
            if (!badge) return;
            
            // Get last viewed from localStorage
            const lastViewed = localStorage.getItem('lastViewedNoticeCount');
            const unreadCount = lastViewed ? totalNotices - parseInt(lastViewed) : 0;
            
            if (unreadCount > 0) {
                badge.textContent = unreadCount;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Init badge count error:', error);
    }
}

// Mark notices as viewed when entering notices section
window.markNoticesAsViewed = function() {
    const badge = document.getElementById('notificationBadge');
    if (badge) {
        badge.style.display = 'none';
        badge.textContent = '0';
    }
    
    // Store current count in localStorage
    if (totalNotices > 0) {
        localStorage.setItem('lastViewedNoticeCount', totalNotices.toString());
    }
}


// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Socket.IO for real-time notifications
    initNoticeSocket();
    
    // Initialize badge count
    initBadgeCount();
    
    // Load notices if on notices section
    if (document.getElementById('notices-section')) {
        loadCitizenNotices();
    }
});

// Also reload when switching to notices section
const originalShowSection = window.showSection;
if (originalShowSection) {
    window.showSection = function(sectionName) {
        originalShowSection(sectionName);
        if (sectionName === 'notices') {
            loadCitizenNotices();
        }
    };
}
