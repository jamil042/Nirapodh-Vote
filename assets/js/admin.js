let candidateCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    const ballotForm = document.getElementById('ballotForm');
    if (ballotForm) {
        ballotForm.addEventListener('submit', handleBallotSubmit);
    }
    
    const noticeForm = document.getElementById('noticeForm');
    if (noticeForm) {
        noticeForm.addEventListener('submit', handleNoticeSubmit);
    }
    
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', handlePasswordChange);
    }
}

function showSection(sectionId) {
    const sections = document.querySelectorAll('.content-section');
    sections.forEach(section => {
        section.classList.remove('active');
    });
    
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
    });
    
    const selectedSection = document.getElementById(sectionId + '-section');
    if (selectedSection) {
        selectedSection.classList.add('active');
    }
    
    event.target.closest('.nav-item').classList.add('active');
}

function addCandidate() {
    candidateCount++;
    const candidatesList = document.getElementById('candidatesList');
    
    const candidateCard = document.createElement('div');
    candidateCard.className = 'card mt-20';
    candidateCard.id = `candidate-${candidateCount}`;
    candidateCard.innerHTML = `
        <h4>প্রার্থী #${toBengaliNumber(candidateCount)}</h4>
        <div class="form-row">
            <div class="form-group">
                <label>প্রার্থীর নাম *</label>
                <input type="text" required placeholder="প্রার্থীর পূর্ণ নাম">
            </div>
            <div class="form-group">
                <label>রাজনৈতিক দল *</label>
                <input type="text" required placeholder="যেমন: জাতীয় নাগরিক পার্টি">
            </div>
        </div>
        <div class="form-row">
            <div class="form-group">
                <label>প্রার্থীর ছবি</label>
                <input type="file" accept="image/*">
            </div>
            <div class="form-group">
                <label>দলীয় প্রতীক (মার্কা)</label>
                <input type="file" accept="image/*">
            </div>
        </div>
        
        <!-- New Fields -->
        <div class="form-group">
            <label>জীবনী (Bio)</label>
            <textarea rows="3" placeholder="প্রার্থীর সংক্ষিপ্ত জীবনী..."></textarea>
        </div>
        <div class="form-group">
            <label>নির্বাচনী ইশতেহার (Manifesto)</label>
            <textarea rows="3" placeholder="ইশতেহারের পয়েন্টগুলো লিখুন..."></textarea>
        </div>
        <div class="form-group">
            <label>সামাজিক কর্মকাণ্ড</label>
            <textarea rows="2" placeholder="সামাজিক কর্মকাণ্ডের বিবরণ..."></textarea>
        </div>
        <div class="form-group">
            <label>দলীয় ইতিহাস</label>
            <textarea rows="2" placeholder="দলের সংক্ষিপ্ত ইতিহাস..."></textarea>
        </div>

        <button type="button" class="btn btn-danger btn-sm" onclick="removeCandidate(${candidateCount})">
            এই প্রার্থী সরান
        </button>
    `;
    
    candidatesList.appendChild(candidateCard);
}

function removeCandidate(id) {
    const candidateCard = document.getElementById(`candidate-${id}`);
    if (candidateCard && confirm('আপনি কি এই প্রার্থী সরাতে চান?')) {
        candidateCard.remove();
    }
}

function handleBallotSubmit(e) {
    e.preventDefault();
    
    const ballotName = document.getElementById('ballotName').value;
    const ballotLocation = document.getElementById('ballotLocation').value;
    
    if (!ballotName || !ballotLocation) {
        showAlert('সকল প্রয়োজনীয় তথ্য পূরণ করুন', 'error');
        return;
    }
    
    showAlert('ব্যালট সফলভাবে তৈরি হয়েছে!', 'success');
    e.target.reset();
    candidateCount = 0;
    document.getElementById('candidatesList').innerHTML = '';
}

function previewBallot() {
    showAlert('ব্যালট পূর্বরূপ শীঘ্রই উপলব্ধ হবে', 'info');
}

function toggleNoticeContent(type) {
    const textContent = document.getElementById('textContent');
    const pdfContent = document.getElementById('pdfContent');
    
    if (type === 'text') {
        textContent.classList.remove('hidden');
        pdfContent.classList.add('hidden');
    } else {
        textContent.classList.add('hidden');
        pdfContent.classList.remove('hidden');
    }
}
