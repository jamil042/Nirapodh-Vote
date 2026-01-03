let candidateCount = 0;

document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
});

function initializeDashboard() {
    loadDashboardData(); // Load mock data
    loadCandidatesData(); // Load mock candidates data

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

function handleNoticeSubmit(e) {
    e.preventDefault();
    
    showAlert('নোটিশ সফলভাবে প্রকাশিত হয়েছে!', 'success');
    e.target.reset();
}

function calculateResults() {
    showAlert('ফলাফল পুনর্গণনা করা হচ্ছে...', 'info');
    setTimeout(() => {
        showAlert('ফলাফল সফলভাবে গণনা করা হয়েছে!', 'success');
    }, 2000);
}

function exportResults() {
    showAlert('PDF তৈরি করা হচ্ছে...', 'info');
    setTimeout(() => {
        showAlert('ফলাফল PDF হিসেবে রপ্তানি হয়েছে!', 'success');
    }, 2000);
}

function publishResults() {
    if (confirm('আপনি কি ফলাফল প্রকাশ করতে চান? প্রকাশের পর সকল নাগরিক দেখতে পারবে।')) {
        showAlert('ফলাফল সফলভাবে প্রকাশিত হয়েছে!', 'success');
    }
}

function editCandidate(id) {
    showAlert('প্রার্থী সম্পাদনা ফিচার শীঘ্রই আসছে', 'info');
}

function deleteCandidate(id) {
    if (confirm('আপনি কি এই প্রার্থী মুছে ফেলতে চান?')) {
        showAlert('প্রার্থী সফলভাবে মুছে ফেলা হয়েছে', 'success');
    }
}

function sendMessage() {
    const messageInput = document.getElementById('chatMessage');
    if (!messageInput || !messageInput.value.trim()) return;
    
    const chatMessages = document.querySelector('.chat-messages');
    const message = messageInput.value;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = 'message admin-message';
    messageDiv.innerHTML = `
        <p>${message}</p>
        <span class="message-time">${new Date().toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
    `;
    
    chatMessages.appendChild(messageDiv);
    messageInput.value = '';
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function handlePasswordChange(e) {
    e.preventDefault();
    
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmNewPassword = document.getElementById('confirmNewPassword').value;
    
    if (newPassword !== confirmNewPassword) {
        showAlert('নতুন পাসওয়ার্ড মিলছে না', 'error');
        return;
    }
    
    if (newPassword.length < 8) {
        showAlert('পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে', 'error');
        return;
    }
    
    showAlert('পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!', 'success');
    e.target.reset();
}

const candidateData = {
    1: {
        name: "ওসমান হাদি",
        party: "স্বতন্ত্র প্রার্থী",
        symbol: "assets/images/powerful-symbol-unity-anti-corruption-day_968957-12635.avif",
        photo: "assets/images/WhatsApp Image 2025-12-27 at 11.35.15 PM.jpeg",
        bio: "ওসমান হাদি একজন সমাজসেবক ও রাজনীতিবিদ। তিনি দীর্ঘ দুই দশক ধরে ঢাকা-৮ আসনের মানুষের কল্যাণে কাজ করে যাচ্ছেন। দুর্নীতিমুক্ত সমাজ গড়ার প্রত্যয়ে তিনি এবার স্বতন্ত্র প্রার্থী হিসেবে নির্বাচনে অংশগ্রহণ করছেন।",
        manifesto: [
            "দুর্নীতিমুক্ত প্রশাসনিক ব্যবস্থা নিশ্চিত করা",
            "যুব সমাজের জন্য কর্মসংস্থান সৃষ্টি",
            "আধুনিক বর্জ্য ব্যবস্থাপনা ও পরিচ্ছন্ন এলাকা"
        ],
        socialActivities: [
            "প্রতিষ্ঠাতা, সবুজ বাংলা ফাউন্ডেশন",
            "প্রধান উপদেষ্টা, এলাকা উন্নয়ন কমিটি"
        ],
        partyHistory: "স্বতন্ত্র প্রার্থী হিসেবে তিনি কোনো নির্দিষ্ট রাজনৈতিক দলের অন্তর্ভুক্ত নন, তবে তিনি মুক্তিযুদ্ধের চেতনায় বিশ্বাসী এবং সর্বস্তরের মানুষের অধিকার আদায়ে সোচ্চার।"
    },
    2: {
        name: "হাসনাত আবদুল্লাহ",
        party: "ন্যাশনাল সিটিজেন পার্টি (এনসিপি)",
        symbol: "assets/images/জাতীয়_নাগরিক_পার্টির_লোগো.svg.png",
        photo: "assets/images/hasnat.jpg",
        bio: "হাসনাত আবদুল্লাহ বৈষম্যবিরোধী ছাত্র আন্দোলনের অন্যতম সমন্বয়ক এবং তরুণ রাজনৈতিক ব্যক্তিত্ব। তিনি রাষ্ট্র সংস্কার এবং নতুন রাজনৈতিক বন্দোবস্তের লক্ষ্যে কাজ করছেন। ছাত্র-জনতার অভ্যুত্থানে তার নেতৃত্ব তাকে জাতীয় পরিচিতি এনে দিয়েছে।",
        manifesto: [
            "রাষ্ট্রীয় কাঠামোর আমূল সংস্কার",
            "শিক্ষা ও স্বাস্থ্যখাতে বাজেট বৃদ্ধি",
            "নাগরিক অধিকার ও বাকস্বাধীনতা নিশ্চিত করা"
        ],
        socialActivities: [
            "সমন্বয়ক, বৈষম্যবিরোধী ছাত্র আন্দোলন",
            "স্বেচ্ছাসেবী, বন্যার্তদের সহায়তা কার্যক্রম"
        ],
        partyHistory: "ন্যাশনাল সিটিজেন পার্টি (এনসিপি) একটি নতুন প্রজন্মের রাজনৈতিক দল যা ২০২৪ সালের ছাত্র-জনতার অভ্যুত্থানের পরবর্তী সময়ে গঠিত হয়। দলটি সাম্য, মানবিক মর্যাদা এবং সামাজিক সুবিচার প্রতিষ্ঠার লক্ষ্যে কাজ করছে।"
    }
};

function viewCandidateDetails(candidateId) {
    const modal = document.getElementById('candidateModal');
    const modalBody = document.getElementById('candidateModalBody');
    const candidate = candidateData[candidateId];

    if (!candidate) {
        alert("প্রার্থীর তথ্য পাওয়া যায়নি");
        return;
    }

    let manifestoHtml = '<ul class="detail-list">';
    candidate.manifesto.forEach(item => {
        manifestoHtml += `<li>${item}</li>`;
    });
    manifestoHtml += '</ul>';

    let socialHtml = '<ul class="detail-list">';
    candidate.socialActivities.forEach(item => {
        socialHtml += `<li>${item}</li>`;
    });
    socialHtml += '</ul>';

    modalBody.innerHTML = `
        <div class="candidate-profile-header">
            <img src="${candidate.photo}" alt="${candidate.name}" class="candidate-profile-img">
            <div class="candidate-profile-info">
                <h3>${candidate.name}</h3>
                <div class="candidate-party-info">
                    <img src="${candidate.symbol}" alt="প্রতীক" class="party-symbol-small">
                    <strong>${candidate.party}</strong>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h4>জীবনী</h4>
            <p>${candidate.bio}</p>
        </div>

        <div class="detail-section">
            <h4>নির্বাচনী ইশতেহার</h4>
            ${manifestoHtml}
        </div>

        <div class="detail-section">
            <h4>সামাজিক কর্মকাণ্ড</h4>
            ${socialHtml}
        </div>

        <div class="detail-section">
            <h4>দলীয় ইতিহাস</h4>
            <p>${candidate.partyHistory}</p>
        </div>
    `;

    modal.style.display = "block";
}

function closeCandidateModal() {
    const modal = document.getElementById('candidateModal');
    modal.style.display = "none";
}

window.onclick = function(event) {
    const modal = document.getElementById('candidateModal');
    if (event.target == modal) {
        modal.style.display = "none";
    }
}