<<<<<<< HEAD
// Login page JavaScript with UI States
=======
// Login page JavaScript with Backend Integration
>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    
<<<<<<< HEAD
=======
    // Only check for existing login if NOT explicitly navigating to login page
    // This allows users to logout and login again
    const fromLogout = sessionStorage.getItem('justLoggedOut');
    if (fromLogout) {
        sessionStorage.removeItem('justLoggedOut');
        removeAuthToken();
        removeUserData();
    } else {
        // Check if user is already logged in
        const token = getAuthToken();
        if (token) {
            verifyToken(token);
        }
    }

>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
});

<<<<<<< HEAD
=======
// Verify if the stored token is still valid
async function verifyToken(token) {
    try {
        const response = await apiRequest('GET_USER', 'GET', null, true);
        if (response.success) {
            console.log('User already logged in, redirecting to dashboard');
            window.location.href = 'citizen-dashboard.html';
        } else {
            // Token invalid or expired
            console.log('Token expired or invalid, clearing auth');
            removeAuthToken();
            removeUserData();
        }
    } catch (error) {
        console.error('Token verification failed:', error);
        // Clear invalid token on error
        removeAuthToken();
        removeUserData();
    }
}

>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103
/* ===========================
   UI STATE MANAGEMENT
   =========================== */

// Show Alert with Auto-dismiss
function showAlert(message, type = 'info', title = '', duration = 5000) {
    const alertContainer = document.getElementById('alertContainer');
    if (!alertContainer) return;

    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    let iconClass = '';
    switch(type) {
        case 'success': iconClass = 'fa-circle-check'; title = title || '✓ সফল'; break;
        case 'error': iconClass = 'fa-circle-xmark'; title = title || '✗ ত্রুটি'; break;
        case 'warning': iconClass = 'fa-triangle-exclamation'; title = title || '⚠ সতর্কতা'; break;
        case 'info': iconClass = 'fa-circle-info'; title = title || 'ℹ তথ্য'; break;
    }

    alertDiv.innerHTML = `
        <div class="alert-icon">
            <i class="fa-solid ${iconClass}"></i>
        </div>
        <div class="alert-content">
            <div class="alert-title">${title}</div>
            <div class="alert-message">${message}</div>
        </div>
        <button class="alert-close" onclick="this.parentElement.remove()">
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    alertContainer.innerHTML = '';
    alertContainer.appendChild(alertDiv);

    // Auto-dismiss
    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.classList.add('removing');
            setTimeout(() => alertDiv.remove(), 300);
        }
    }, duration);
}

// Show Loading State
function showLoadingState() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('loading');
    }

    if (btnText) btnText.style.display = 'none';
    if (btnLoader) {
        btnLoader.classList.remove('hidden');
        btnLoader.style.display = 'inline-block';
    }
}

// Hide Loading State
function hideLoadingState() {
    const submitBtn = document.getElementById('submitBtn');
    const btnText = document.getElementById('btnText');
    const btnLoader = document.getElementById('btnLoader');

    if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('loading');
    }

    if (btnText) btnText.style.display = 'inline';
    if (btnLoader) {
        btnLoader.classList.add('hidden');
        btnLoader.style.display = 'none';
    }
}

// Show Success State
function showSuccessState() {
    const form = document.getElementById('loginForm');
    if (!form) return;

    const alertContainer = document.getElementById('alertContainer');
    if (alertContainer) {
        alertContainer.innerHTML = `
            <div class="alert alert-success">
                <div class="alert-icon">
                    <i class="fa-solid fa-circle-check"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">✓ লগইন সফল!</div>
                    <div class="alert-message">ড্যাশবোর্ডে নিয়ে যাওয়া হচ্ছে...</div>
                </div>
            </div>
        `;
    }

    // Disable form
    form.style.opacity = '0.6';
    form.style.pointerEvents = 'none';

<<<<<<< HEAD
    // Redirect after 2 seconds
    setTimeout(() => {
        window.location.href = 'citizen-dashboard.html';
    }, 2000);
}

// Show Network Error State
function showNetworkError() {
    showAlert('সার্ভারের সাথে সংযোগ ব্যর্থ। অনুগ্রহ করে পুনরায় চেষ্টা করুন।', 'error', '✗ নেটওয়ার্ক ত্রুটি');
}

// Show Server Error State
function showServerError(message = '') {
    const errorMsg = message || 'অ্যাকাউন্ট খুঁজে পাওয়া যায়নি। NID এবং পাসওয়ার্ড পুনরায় পরীক্ষা করুন।';
    showAlert(errorMsg, 'error', '✗ লগইন ব্যর্থ');
=======
    // Redirect after 1.5 seconds
    setTimeout(() => {
        window.location.href = 'citizen-dashboard.html';
    }, 1500);
>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103
}

// Validate Form
function validateLoginForm() {
    const errors = [];
    const nid = document.getElementById('nid').value.trim();
    const password = document.getElementById('password').value;

    if (!nid) {
        errors.push('NID নম্বর প্রয়োজন');
    } else if (nid.length < 10) {
        errors.push('NID নম্বর কমপক্ষে ১০ সংখ্যার হতে হবে');
    } else if (!/^\d+$/.test(nid)) {
        errors.push('NID শুধুমাত্র সংখ্যা হতে হবে');
    }

    if (!password) {
        errors.push('পাসওয়ার্ড প্রয়োজন');
<<<<<<< HEAD
    } else if (password.length < 8) {
        errors.push('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে');
=======
    } else if (password.length < 6) { // Changed to 6 as per backend validation
        errors.push('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে');
>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103
    }

    return errors;
}

<<<<<<< HEAD
function handleLogin(e) {
=======
async function handleLogin(e) {
>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103
    e.preventDefault();
    
    // Validate form
    const errors = validateLoginForm();
    
    if (errors.length > 0) {
        showAlert(errors.join(', '), 'error', '✗ ত্রুটি');
        return;
    }
    
    // Show loading state
    showLoadingState();

<<<<<<< HEAD
    // Simulate API call
    setTimeout(() => {
        // Simulate random success/error for demo
        const nid = document.getElementById('nid').value;
        const isSuccess = nid === '1234567890'; // Demo: only this NID works

        if (isSuccess) {
            showSuccessState();
        } else {
            hideLoadingState();
            showServerError();
        }
    }, 2000);
=======
    try {
        const nid = document.getElementById('nid').value.trim();
        const password = document.getElementById('password').value; // Don't trim password

        // Call Backend API
        const response = await apiRequest('LOGIN', 'POST', {
            nid,
            password
        });

        if (response.success) {
            // Save info
            console.log('Login Response:', response); // Debug log
            console.log('User Data to Save:', response.user); // Debug log
            saveAuthToken(response.token);
            saveUserData(response.user);
            
            showSuccessState();
        } else {
            hideLoadingState();
            showAlert(response.message || 'লগইন ব্যর্থ হয়েছে', 'error', '✗ লগইন ব্যর্থ');
        }

    } catch (error) {
        hideLoadingState();
        console.error('Login error:', error);
        showAlert(error.message || 'সার্ভার ত্রুটি। অনুগ্রহ করে আবার চেষ্টা করুন।', 'error', '✗ ত্রুটি');
    }
>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103
}

// Forgot Password Handler
function forgotPassword() {
<<<<<<< HEAD
    showAlert('পাসওয়ার্ড রিসেট লিংক আপনার মোবাইলে পাঠানো হয়েছে।', 'info', 'ℹ তথ্য');
    return false;
=======
    showAlert('পাসওয়ার্ড রিসেট লিংক আপনার মোবাইলে পাঠানো হয়েছে (মক)।', 'info', 'ℹ তথ্য');
>>>>>>> b8a55524dacf6f417bf815cef424a7eafaa6b103
}

// Toggle password visibility
function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const button = event.target.closest('.toggle-password');
    
    if (field.type === 'password') {
        field.type = 'text';
        if (button) button.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        field.type = 'password';
        if (button) button.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
}
