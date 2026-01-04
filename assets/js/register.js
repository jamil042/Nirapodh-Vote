// Register page JavaScript with UI States

document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
        
        // Auto-fetch demo on NID and DOB input
        const nidInput = document.getElementById('nid');
        const dobInput = document.getElementById('dob');
        
        if (nidInput && dobInput) {
            dobInput.addEventListener('change', function() {
                if (validateNID(nidInput.value) && dobInput.value) {
                    simulateAutoFetch();
                }
            });
        }
    }
});

/* ===========================
   REGISTERED USERS STORAGE
   =========================== */

// Get all registered users
function getRegisteredUsers() {
    const users = localStorage.getItem('nirapodh_users');
    return users ? JSON.parse(users) : {};
}

// Save user credentials
function saveUserCredentials(nid, password) {
    const users = getRegisteredUsers();
    users[nid] = {
        nid: nid,
        password: password,
        registeredAt: new Date().toISOString()
    };
    localStorage.setItem('nirapodh_users', JSON.stringify(users));
}

// Check if user exists
function userExists(nid) {
    const users = getRegisteredUsers();
    return users.hasOwnProperty(nid);
}

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
    const form = document.getElementById('registerForm');
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

// Show Loading State for Auto-fetch
function showAutoFetchLoadingState() {
    const autoFetchInfo = document.getElementById('autoFetchInfo');
    if (autoFetchInfo) {
        autoFetchInfo.innerHTML = `
            <div class="loading-state">
                <div class="loading-spinner"></div>
            </div>
        `;
        autoFetchInfo.style.display = 'block';
    }
}

// Show Success State for Auto-fetch
function showAutoFetchSuccessState() {
    const autoFetchInfo = document.getElementById('autoFetchInfo');
    if (autoFetchInfo) {
        autoFetchInfo.innerHTML = `
            <h4>✓ স্বয়ংক্রিয় তথ্য সংগ্রহ</h4>
            <div class="info-item">
                <label>মোবাইল নম্বর:</label>
                <span id="fetchedPhone">০১৭১২৩৪৫৬৭৮</span>
            </div>
            <div class="info-item">
                <label>ঠিকানা:</label>
                <span id="fetchedAddress">ঢাকা, বাংলাদেশ</span>
            </div>
            <div class="info-item">
                <label>ভোট কেন্দ্র:</label>
                <span id="fetchedCenter">ঢাকা সিটি কলেজ</span>
            </div>
        `;
        autoFetchInfo.style.display = 'block';
    }
}

// Validate Form
function validateRegisterForm() {
    const errors = [];
    const nid = document.getElementById('nid').value.trim();
    const dob = document.getElementById('dob').value;

    if (!nid) {
        errors.push('NID নম্বর প্রয়োজন');
    } else if (nid.length < 10 || nid.length > 17) {
        errors.push('NID নম্বর ১০ বা ১৭ সংখ্যার হতে হবে');
    } else if (!/^\d+$/.test(nid)) {
        errors.push('NID শুধুমাত্র সংখ্যা হতে হবে');
    }

    if (!dob) {
        errors.push('জন্ম তারিখ প্রয়োজন');
    }

    return errors;
}

function handleRegister(e) {
    e.preventDefault();
    
    // Validate form
    const errors = validateRegisterForm();
    
    if (errors.length > 0) {
        showAlert(errors.join(', '), 'error', '✗ ত্রুটি');
        return;
    }

    const nid = document.getElementById('nid').value.trim();
    
    // Check if user already exists
    if (userExists(nid)) {
        showAlert('এই NID দিয়ে ইতিমধ্যে একটি অ্যাকাউন্ট রয়েছে। লগইন করতে যান।', 'error', '✗ ত্রুটি');
        return;
    }
    
    // Show loading state
    showLoadingState();

    // Simulate API call
    setTimeout(() => {
        // Save registration (simulate 80% success rate)
        const isSuccess = Math.random() > 0.2; // 80% success rate

        if (isSuccess) {
            hideLoadingState();
            
            // Initialize user with NID (password will be set later in signup)
            const tempPassword = 'TempPass@123';
            saveUserCredentials(nid, tempPassword);
            
            // Store NID in sessionStorage for signup page
            sessionStorage.setItem('registeringNid', nid);
            
            const alertContainer = document.getElementById('alertContainer');
            if (alertContainer) {
                alertContainer.innerHTML = `
                    <div class="alert alert-success">
                        <div class="alert-icon">
                            <i class="fa-solid fa-circle-check"></i>
                        </div>
                        <div class="alert-content">
                            <div class="alert-title">✓ নিবন্ধন সফল!</div>
                            <div class="alert-message">আপনার পাসওয়ার্ড তৈরি করতে সাইনআপ পেজে যাচ্ছেন...</div>
                        </div>
                    </div>
                `;
            }

            // Redirect after 2 seconds
            setTimeout(() => {
                window.location.href = 'signup.html';
            }, 2000);
        } else {
            hideLoadingState();
            showAlert('নেটওয়ার্ক ত্রুটি। অনুগ্রহ করে পুনরায় চেষ্টা করুন।', 'error', '✗ ত্রুটি');
        }
    }, 2000);
}

function simulateAutoFetch() {
    showAutoFetchLoadingState();
    
    // Simulate fetching data from backend
    setTimeout(() => {
        showAutoFetchSuccessState();
        showAlert('আপনার তথ্য সফলভাবে সংগ্রহ করা হয়েছে', 'success', '✓ সফল');
    }, 1500);
}

// Validate NID
function validateNID(nid) {
    if (!nid) return false;
    if (nid.length < 10 || nid.length > 17) return false;
    return /^\d+$/.test(nid);
}
