// Forgot Password Page - Multi-step OTP-based Password Reset

let currentStep = 1;
let userNID = '';
let userPhone = '';
let countdownInterval = null;
const OTP_EXPIRY_SECONDS = 120; // 2 minutes

document.addEventListener('DOMContentLoaded', function() {
    updateStepDescription();
    
    // Form submissions
    document.getElementById('phoneForm').addEventListener('submit', handleSendOTP);
    document.getElementById('otpForm').addEventListener('submit', handleVerifyOTP);
    document.getElementById('passwordForm').addEventListener('submit', handleResetPassword);
    document.getElementById('resendOtpBtn').addEventListener('click', handleResendOTP);
});

// Update step description
function updateStepDescription() {
    const descriptions = {
        1: 'আপনার নিবন্ধিত NID এবং মোবাইল নম্বর দিন',
        2: 'আপনার মোবাইলে পাঠানো OTP কোড লিখুন',
        3: 'নতুন পাসওয়ার্ড সেট করুন'
    };
    document.getElementById('stepDescription').textContent = descriptions[currentStep];
}

// Navigate to next step
function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.step-container').forEach(el => el.classList.remove('active'));
    
    // Show current step
    document.getElementById(`step${step}`).classList.add('active');
    
    // Update step indicators
    document.querySelectorAll('.step-dot').forEach((dot, index) => {
        dot.classList.remove('active', 'completed');
        if (index + 1 < step) {
            dot.classList.add('completed');
        } else if (index + 1 === step) {
            dot.classList.add('active');
        }
    });
    
    currentStep = step;
    updateStepDescription();
    
    // Clear alert
    document.getElementById('alertContainer').innerHTML = '';
}

// Show Alert
function showAlert(message, type = 'info') {
    const alertContainer = document.getElementById('alertContainer');
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type}`;
    
    let iconClass = '';
    let title = '';
    switch(type) {
        case 'success': iconClass = 'fa-circle-check'; title = '✓ সফল'; break;
        case 'error': iconClass = 'fa-circle-xmark'; title = '✗ ত্রুটি'; break;
        case 'warning': iconClass = 'fa-triangle-exclamation'; title = '⚠ সতর্কতা'; break;
        case 'info': iconClass = 'fa-circle-info'; title = 'ℹ তথ্য'; break;
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

    setTimeout(() => {
        if (alertDiv.parentElement) {
            alertDiv.remove();
        }
    }, 5000);
}

// Set button loading state
function setButtonLoading(buttonId, isLoading, loadingText = 'অপেক্ষা করুন...') {
    const button = document.getElementById(buttonId);
    const span = button.querySelector('span');
    
    if (isLoading) {
        button.disabled = true;
        button.classList.add('is-loading');
        span.dataset.originalText = span.textContent;
        span.textContent = loadingText;
    } else {
        button.disabled = false;
        button.classList.remove('is-loading');
        if (span.dataset.originalText) {
            span.textContent = span.dataset.originalText;
        }
    }
}

// Start countdown timer
function startCountdown() {
    let timeLeft = OTP_EXPIRY_SECONDS;
    const countdownEl = document.getElementById('countdown');
    const resendBtn = document.getElementById('resendOtpBtn');
    
    resendBtn.disabled = true;
    
    countdownInterval = setInterval(() => {
        timeLeft--;
        const minutes = Math.floor(timeLeft / 60);
        const seconds = timeLeft % 60;
        countdownEl.textContent = `OTP মেয়াদ শেষ হবে ${minutes}:${seconds.toString().padStart(2, '0')} মিনিটে`;
        
        if (timeLeft <= 0) {
            clearInterval(countdownInterval);
            countdownEl.textContent = 'OTP মেয়াদ শেষ হয়েছে';
            resendBtn.disabled = false;
        }
    }, 1000);
}

// Stop countdown
function stopCountdown() {
    if (countdownInterval) {
        clearInterval(countdownInterval);
        countdownInterval = null;
    }
}

// Step 1: Send OTP
async function handleSendOTP(e) {
    e.preventDefault();
    
    const nid = document.getElementById('nid').value.trim();
    const phoneNumber = document.getElementById('phoneNumber').value.trim();
    
    // Validation
    if (!nid || nid.length < 10) {
        showAlert('সঠিক NID নম্বর লিখুন', 'error');
        return;
    }
    
    if (!phoneNumber || !/^01[3-9]\d{8}$/.test(phoneNumber)) {
        showAlert('সঠিক মোবাইল নম্বর লিখুন (01XXXXXXXXX)', 'error');
        return;
    }
    
    setButtonLoading('sendOtpBtn', true, 'OTP পাঠানো হচ্ছে...');
    
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/auth/forgot-password-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ nid, phoneNumber })
        });
        
        const data = await response.json();
        
        if (data.success) {
            userNID = nid;
            userPhone = phoneNumber;
            showAlert('OTP আপনার মোবাইলে পাঠানো হয়েছে', 'success');
            setTimeout(() => {
                goToStep(2);
                startCountdown();
            }, 1500);
        } else {
            showAlert(data.message || 'OTP পাঠাতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Send OTP error:', error);
        showAlert('সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন', 'error');
    } finally {
        setButtonLoading('sendOtpBtn', false);
    }
}

// Step 2: Verify OTP
async function handleVerifyOTP(e) {
    e.preventDefault();
    
    const otp = document.getElementById('otp').value.trim();
    
    if (!otp || otp.length !== 6) {
        showAlert('৬ সংখ্যার OTP কোড লিখুন', 'error');
        return;
    }
    
    setButtonLoading('verifyOtpBtn', true, 'যাচাই করা হচ্ছে...');
    
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/auth/verify-reset-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                nid: userNID,
                otp: otp
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            stopCountdown();
            showAlert('OTP যাচাই সফল হয়েছে', 'success');
            setTimeout(() => {
                goToStep(3);
            }, 1500);
        } else {
            showAlert(data.message || 'OTP যাচাই ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Verify OTP error:', error);
        showAlert('সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন', 'error');
    } finally {
        setButtonLoading('verifyOtpBtn', false);
    }
}

// Step 3: Reset Password
async function handleResetPassword(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    // Validation
    if (!newPassword || newPassword.length < 6) {
        showAlert('পাসওয়ার্ড কমপক্ষে ৬ অক্ষরের হতে হবে', 'error');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showAlert('পাসওয়ার্ড মিলছে না', 'error');
        return;
    }
    
    setButtonLoading('resetPasswordBtn', true, 'পাসওয়ার্ড পরিবর্তন হচ্ছে...');
    
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/auth/reset-password`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                nid: userNID,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে! লগইন পেজে নিয়ে যাওয়া হচ্ছে...', 'success');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
        } else {
            showAlert(data.message || 'পাসওয়ার্ড পরিবর্তন ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Reset password error:', error);
        showAlert('সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন', 'error');
    } finally {
        setButtonLoading('resetPasswordBtn', false);
    }
}

// Resend OTP
async function handleResendOTP() {
    document.getElementById('otp').value = '';
    setButtonLoading('resendOtpBtn', true);
    
    try {
        const response = await fetch(`${API_CONFIG.API_URL}/auth/forgot-password-otp`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
                nid: userNID,
                phoneNumber: userPhone
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('নতুন OTP পাঠানো হয়েছে', 'success');
            startCountdown();
        } else {
            showAlert(data.message || 'OTP পাঠাতে ব্যর্থ হয়েছে', 'error');
        }
    } catch (error) {
        console.error('Resend OTP error:', error);
        showAlert('সার্ভার ত্রুটি। পরে আবার চেষ্টা করুন', 'error');
    } finally {
        document.getElementById('resendOtpBtn').disabled = false;
    }
}

// Toggle password visibility
function togglePasswordVisibility(fieldId) {
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
