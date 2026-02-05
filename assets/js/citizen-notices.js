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

        if (notices.length === 0) {
            noticesContainer.innerHTML = '<p style="text-align: center; color: #999; padding: 20px;">কোন নোটিশ উপলব্ধ নেই</p>';
            return;
        }

        let html = '';
        notices.forEach(notice => {
            html += renderCitizenNoticeCard(notice);
        });

        noticesContainer.innerHTML = html;

    } catch (error) {
        console.error('Load citizen notices error:', error);
        noticesContainer.innerHTML = '<p style="text-align: center; color: #f44336; padding: 20px;">নোটিশ লোড করতে সমস্যা হয়েছে</p>';
    }
}

function renderCitizenNoticeCard(notice) {
    const isImportant = notice.type === 'জরুরি' || notice.type === 'ফলাফল';
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
        <div class="notice-card ${isImportant ? 'important' : ''}">
            <div class="notice-header">
                <h3>${isImportant ? 'গুরুত্বপূর্ণ: ' : ''}${notice.title}</h3>
                <span class="notice-date">${date}</span>
            </div>
            ${content}
            ${pdfButton}
            ${isImportant ? '<div class="notice-badge">জরুরি</div>' : ''}
        </div>
    `;
}

function viewCitizenNoticePDF(pdfUrl) {
    // Remove /api from URL since uploads are served from root /uploads
    const baseUrl = API_CONFIG.API_URL.replace('/api', '');
    window.open(baseUrl + pdfUrl, '_blank');
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
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
