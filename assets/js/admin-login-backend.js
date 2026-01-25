// Admin Login page JavaScript - Backend Connected Version

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('adminLoginForm');
    
    // Don't auto-redirect - let user login again if they want
    // Clear any old tokens on login page visit for fresh login
    
    if (loginForm) {
        loginForm.addEventListener('submit', handleAdminLogin);
    }
});

async function verifyAdminAndRedirect() {
    const token = localStorage.getItem('nirapodh_admin_token');
    if (token) {
        // Redirect to admin dashboard
        window.location.href = 'admin-dashboard.html';
    }
}

// Handle Admin Login
async function handleAdminLogin(e) {
    e.preventDefault();
    
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value;

    // Validation
    if (!username || !password) {
        showAlert('ইউজারনেম এবং পাসওয়ার্ড প্রদান করুন', 'error');
        return;
    }

    showLoadingState();

    try {
        // Admin login via API
        const url = `${API_CONFIG.API_URL}/admin/login`;
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const result = await response.json();

        if (result.success) {
            // Save admin token to sessionStorage
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
        hideLoadingState();
        showAlert(error.message || 'লগইন ব্যর্থ হয়েছে', 'error');
    }
}

function showLoadingState() {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    if (submitBtn) {
        submitBtn.disabled = true;
        if (btnText) btnText.classList.add('hidden');
        if (btnLoader) btnLoader.classList.remove('hidden');
    }
}

function hideLoadingState() {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');
    if (submitBtn) {
        submitBtn.disabled = false;
        if (btnText) btnText.classList.remove('hidden');
        if (btnLoader) btnLoader.classList.add('hidden');
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
