// Update password page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Check if user is logged in and has a token
    const token = sessionStorage.getItem('nirapodh_admin_token');
    if (!token) {
        showAlert('অনুগ্রহ করে প্রথমে লগইন করুন', 'error');
        setTimeout(() => {
            window.location.href = 'admin-login.html';
        }, 2000);
        return;
    }

    const updatePasswordForm = document.getElementById('updatePasswordForm');
    if (updatePasswordForm) {
        updatePasswordForm.addEventListener('submit', handleUpdatePassword);
    }
});

async function handleUpdatePassword(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validate password
    if (!newPassword || newPassword.length < 6) {
        showAlert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error');
        return;
    }
    
    // Check if passwords match
    if (newPassword !== confirmPassword) {
        showAlert('পাসওয়ার্ড মিলছে না', 'error');
        return;
    }
    
    setButtonLoading('submitBtn', true);
    
    try {
        const token = sessionStorage.getItem('nirapodh_admin_token');
        const url = `${API_CONFIG.API_URL}/admin/update-password`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ newPassword })
        });
        
        const data = await response.json();
        
        setButtonLoading('submitBtn', false);
        
        if (data.success) {
            showAlert('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! আবার লগইন করুন', 'success');
            
            // Clear token and redirect to login
            sessionStorage.removeItem('nirapodh_admin_token');
            sessionStorage.removeItem('nirapodh_admin_user');
            
            setTimeout(() => {
                window.location.href = 'admin-login.html';
            }, 2000);
        } else {
            showAlert(data.message || 'পাসওয়ার্ড পরিবর্তন করতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Update password error:', error);
        setButtonLoading('submitBtn', false);
        showAlert('সার্ভার ত্রুটি হয়েছে', 'error');
    }
}
