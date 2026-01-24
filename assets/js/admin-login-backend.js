// Admin Login page JavaScript - Backend Connected Version

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    
    // Always show login page, don't auto-redirect
    // This ensures admins must actively log in each time
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
});

// Handle Admin Login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    console.log('=== Admin Login Attempt ===');
    console.log('Username:', username);
    console.log('Password length:', password.length);

    // Validation
    if (!username || !password) {
        showAlert('ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন', 'error');
        return;
    }

    showLoadingState();

    try {
        // Admin login via API
        const url = `${API_CONFIG.API_URL}/admin/login`;
        console.log('API URL:', url);
        console.log('Sending request...');
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        console.log('Response status:', response.status);
        const result = await response.json();
        console.log('Response data:', result);

        if (result.success) {
            // Save admin token
            sessionStorage.setItem('nirapodh_admin_token', result.token);
            sessionStorage.setItem('nirapodh_admin_user', JSON.stringify(result.admin));

            hideLoadingState();
            showAlert('লগইন সফল হয়েছে!', 'success');

            // Redirect to admin dashboard
            setTimeout(() => {
                window.location.href = 'admin-dashboard.html';
            }, 1000);
        } else {
            throw new Error(result.message);
        }
    } catch (error) {
        console.error('Login error:', error);
        hideLoadingState();
        showAlert(error.message || 'লগইন ব্যর্থ হয়েছে', 'error');
    }
}

function showLoadingState() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner"></span> প্রক্রিয়াধীন...';
    }
}

function hideLoadingState() {
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> লগইন করুন';
    }
}

function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) {
        alert(message);
        return;
    }

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    let iconClass = '';
    let title = '';
    switch(type) {
        case 'success': 
            iconClass = 'fa-circle-check'; 
            title = '✓ সফল'; 
            break;
        case 'error': 
            iconClass = 'fa-circle-xmark'; 
            title = '✗ ত্রুটি'; 
            break;
    }

    alertDiv.innerHTML = `
        <div class="alert-icon">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="alert-content">
            <div class="alert-title">${title}</div>
            <div class="alert-message">${message}</div>
        </div>
    `;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 3000);
}
