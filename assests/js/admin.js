let candidateCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    // Initialize ballot form
    const ballotForm = document.getElementById('ballotForm');
    if (ballotForm) {
        ballotForm.addEventListener('submit', handleBallotSubmit);
    }
    
    // Initialize notice form
    const noticeForm = document.getElementById('noticeForm');
    if (noticeForm) {
        noticeForm.addEventListener('submit', handleNoticeSubmit);
    }
    
    // Initialize password change form
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }
}

