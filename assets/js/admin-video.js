// Video Management for Admin Dashboard
const API_URL = 'http://localhost:3000/api';

// Get admin token from session
function getAdminToken() {
    return sessionStorage.getItem('nirapodh_admin_token');
}

// Toggle between YouTube and Upload inputs
document.querySelectorAll('input[name="videoType"]').forEach(radio => {
    radio.addEventListener('change', function() {
        const youtubeGroup = document.getElementById('youtubeUrlGroup');
        const fileGroup = document.getElementById('videoFileGroup');
        
        if (this.value === 'youtube') {
            youtubeGroup.style.display = 'block';
            fileGroup.style.display = 'none';
            document.getElementById('youtubeUrl').required = true;
            document.getElementById('videoFile').required = false;
        } else {
            youtubeGroup.style.display = 'none';
            fileGroup.style.display = 'block';
            document.getElementById('youtubeUrl').required = false;
            document.getElementById('videoFile').required = true;
        }
    });
});

// File upload drag and drop
const dropZone = document.getElementById('videoDropZone');
const fileInput = document.getElementById('videoFile');

dropZone.addEventListener('click', () => {
    if (!document.getElementById('videoPreview').style.display || 
        document.getElementById('videoPreview').style.display === 'none') {
        fileInput.click();
    }
});

dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
        fileInput.files = files;
        handleFileSelect({ target: fileInput });
    }
});

fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Check file size (100MB)
    if (file.size > 100 * 1024 * 1024) {
        showAlert('ফাইল সাইজ 100MB এর বেশি হতে পারবে না', 'error');
        fileInput.value = '';
        return;
    }

    // Show preview
    const preview = document.getElementById('videoPreview');
    const video = document.getElementById('previewVideo');
    const fileInfo = document.getElementById('fileInfo');
    
    const url = URL.createObjectURL(file);
    video.src = url;
    
    fileInfo.innerHTML = `
        <strong>${file.name}</strong><br>
        <small>সাইজ: ${(file.size / (1024 * 1024)).toFixed(2)} MB</small>
    `;
    
    document.querySelector('.file-upload-content').style.display = 'none';
    preview.style.display = 'block';
}

function clearVideoFile() {
    fileInput.value = '';
    document.getElementById('videoPreview').style.display = 'none';
    document.querySelector('.file-upload-content').style.display = 'block';
}

// Upload video form submission
document.getElementById('videoUploadForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const uploadBtn = document.getElementById('uploadBtn');
    const originalBtnText = uploadBtn.innerHTML;
    uploadBtn.disabled = true;
    uploadBtn.innerHTML = '<span class="spinner"></span> আপলোড হচ্ছে...';
    
    try {
        const title = document.getElementById('videoTitle').value.trim();
        const description = document.getElementById('videoDescription').value.trim();
        const videoType = document.querySelector('input[name="videoType"]:checked').value;
        
        const formData = new FormData();
        formData.append('title', title);
        formData.append('description', description);
        formData.append('videoType', videoType);
        
        if (videoType === 'youtube') {
            const youtubeUrl = document.getElementById('youtubeUrl').value.trim();
            if (!youtubeUrl) {
                showAlert('YouTube URL প্রদান করুন', 'error');
                return;
            }
            formData.append('youtubeUrl', youtubeUrl);
        } else {
            const videoFile = fileInput.files[0];
            if (!videoFile) {
                showAlert('ভিডিও ফাইল নির্বাচন করুন', 'error');
                return;
            }
            formData.append('video', videoFile);
        }
        
        // Show progress for file uploads
        const progressContainer = document.getElementById('uploadProgress');
        const progressFill = document.getElementById('progressFill');
        const progressText = document.getElementById('progressText');
        
        if (videoType === 'upload') {
            progressContainer.style.display = 'block';
        }
        
        const response = await fetch(`${API_URL}/video/upload`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            },
            body: formData
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert('ভিডিও সফলভাবে আপলোড হয়েছে!', 'success');
            resetVideoForm();
            loadVideos();
        } else {
            showAlert(data.message || 'ভিডিও আপলোড করতে ব্যর্থ হয়েছে', 'error');
        }
        
    } catch (error) {
        console.error('Upload error:', error);
        showAlert('ভিডিও আপলোড করতে ব্যর্থ হয়েছে', 'error');
    } finally {
        uploadBtn.disabled = false;
        uploadBtn.innerHTML = originalBtnText;
        document.getElementById('uploadProgress').style.display = 'none';
    }
});

function resetVideoForm() {
    document.getElementById('videoUploadForm').reset();
    clearVideoFile();
    document.getElementById('youtubeUrlGroup').style.display = 'block';
    document.getElementById('videoFileGroup').style.display = 'none';
}

// Load all videos
async function loadVideos() {
    const container = document.getElementById('videosContainer');
    container.innerHTML = '<div class="loading-spinner">লোড হচ্ছে...</div>';
    
    try {
        const response = await fetch(`${API_URL}/video/all`, {
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            if (data.videos.length === 0) {
                container.innerHTML = '<p class="no-data">কোনো ভিডিও আপলোড করা হয়নি</p>';
                return;
            }
            
            container.innerHTML = data.videos.map(video => `
                <div class="video-item ${video.isActive ? 'active' : ''}">
                    <div class="video-thumbnail">
                        ${video.videoType === 'youtube' ? 
                            `<img src="${video.thumbnailUrl}" alt="${video.title}">
                             <div class="play-overlay">
                                <svg viewBox="0 0 24 24" fill="white" style="width: 48px; height: 48px;">
                                    <path d="M8 5v14l11-7z"/>
                                </svg>
                             </div>` :
                            `<video src="${video.cloudinaryUrl}" style="width: 100%; height: 100%; object-fit: cover;"></video>`
                        }
                        ${video.isActive ? '<span class="active-badge">সক্রিয়</span>' : ''}
                    </div>
                    <div class="video-details">
                        <h4>${video.title}</h4>
                        ${video.description ? `<p>${video.description}</p>` : ''}
                        <div class="video-meta">
                            <span class="video-type-badge ${video.videoType}">
                                ${video.videoType === 'youtube' ? 'YouTube' : 'আপলোড করা'}
                            </span>
                            <span class="video-date">${new Date(video.uploadedAt).toLocaleDateString('bn-BD')}</span>
                        </div>
                        <div class="video-actions">
                            <button class="btn btn-sm ${video.isActive ? 'btn-warning' : 'btn-success'}" 
                                    onclick="toggleVideoActive('${video._id}')">
                                ${video.isActive ? 'নিষ্ক্রিয় করুন' : 'সক্রিয় করুন'}
                            </button>
                            ${video.videoType === 'youtube' ? 
                                `<a href="${video.youtubeUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                    YouTube এ দেখুন
                                </a>` :
                                `<a href="${video.cloudinaryUrl}" target="_blank" class="btn btn-sm btn-secondary">
                                    ভিডিও দেখুন
                                </a>`
                            }
                            <button class="btn btn-sm btn-danger" onclick="deleteVideo('${video._id}')">
                                মুছুন
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="error-message">ভিডিও লোড করতে ব্যর্থ হয়েছে</p>';
        }
        
    } catch (error) {
        console.error('Load videos error:', error);
        container.innerHTML = '<p class="error-message">ভিডিও লোড করতে ব্যর্থ হয়েছে</p>';
    }
}

// Toggle video active status
async function toggleVideoActive(videoId) {
    if (!confirm('আপনি কি নিশ্চিত?')) return;
    
    try {
        const response = await fetch(`${API_URL}/video/${videoId}/toggle`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            loadVideos();
        } else {
            showAlert(data.message || 'আপডেট করতে ব্যর্থ হয়েছে', 'error');
        }
        
    } catch (error) {
        console.error('Toggle video error:', error);
        showAlert('আপডেট করতে ব্যর্থ হয়েছে', 'error');
    }
}

// Delete video
async function deleteVideo(videoId) {
    if (!confirm('আপনি কি এই ভিডিওটি মুছে ফেলতে চান? এই কাজটি পূর্বাবস্থায় ফেরানো যাবে না।')) return;
    
    try {
        const response = await fetch(`${API_URL}/video/${videoId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${getAdminToken()}`
            }
        });
        
        const data = await response.json();
        
        if (data.success) {
            showAlert(data.message, 'success');
            loadVideos();
        } else {
            showAlert(data.message || 'মুছতে ব্যর্থ হয়েছে', 'error');
        }
        
    } catch (error) {
        console.error('Delete video error:', error);
        showAlert('মুছতে ব্যর্থ হয়েছে', 'error');
    }
}

// Initialize videos list when section is shown
document.addEventListener('DOMContentLoaded', () => {
    // Load videos if video section is active
    const videoSection = document.getElementById('video-section');
    if (videoSection && videoSection.classList.contains('active')) {
        loadVideos();
    }
});
