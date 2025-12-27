    // Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupNavigationListeners();
    setupRealtimeFeatures();
    loadUserData();
    updateTimeRemaining();
});

// Initialize dashboard
function initializeDashboard() {
    console.log('নাগরিক ড্যাশবোর্ড লোড হয়েছে');
    
    // Check if user is logged in
    const userData = getUserData();
    if (!userData) {
        window.location.href = 'login.html';
        return;
    }
    
    // Display user name
    document.getElementById('userName').textContent = userData.name || 'নাগরিক';
    document.getElementById('userArea').textContent = userData.area || 'ঢাকা-১০';
    
    // Set active section from URL hash or default to voting
    const hash = window.location.hash.substring(1) || 'voting';
    showSection(hash);
}

// Setup navigation listeners
function setupNavigationListeners() {
    const navItems = document.querySelectorAll('.nav-item');
    
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const section = this.getAttribute('data-section');
            showSection(section);
            
            // Update active state
            navItems.forEach(nav => nav.classList.remove('active'));
            this.classList.add('active');
            
            // Update URL hash
            window.location.hash = section;
        });
    });
}

// Show specific section
function showSection(sectionName) {
    // Hide all sections
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => section.classList.remove('active'));
    
    // Show selected section
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Update navigation active state
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-section') === sectionName) {
            item.classList.add('active');
        }
    });
    
    // Clear notification badges when section is opened
    if (sectionName === 'discussion') {
        const badge = document.getElementById('discussionBadge');
        if (badge) badge.classList.add('hidden');
    }
    if (sectionName === 'chat') {
        const badge = document.getElementById('chatBadge');
        if (badge) badge.classList.add('hidden');
    }
}


// Get user data (simulate - in real app, get from server/session)
function getUserData() {
    // In real application, this would fetch from session/localStorage
    return {
        name: 'মোঃ আবদুল করিম',
        nid: '1234567890123',
        phone: '01712345678',
        area: 'ঢাকা-১০'
    };
}

// Load user data
function loadUserData() {
    // Simulate loading ballots for user's area
    console.log('ব্যবহারকারীর তথ্য লোড হচ্ছে...');
    
    // In real app, fetch from API:
    // fetch('/api/ballots?area=' + userData.area)
    //     .then(response => response.json())
    //     .then(data => displayBallots(data));
}

