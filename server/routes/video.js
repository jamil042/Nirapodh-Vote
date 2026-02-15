// Video Routes - For homepage promotional videos
const express = require('express');
const router = express.Router();
const multer = require('multer');
const cloudinary = require('../config/cloudinary');
const Video = require('../models/Video');
const { authenticateAdmin } = require('../utils/helpers');

// Configure multer for memory storage (no disk storage)
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimeTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime'];
    if (allowedMimeTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('অবৈধ ফাইল ফরম্যাট। শুধুমাত্র MP4, WebM, OGG, MOV ভিডিও আপলোড করুন।'));
    }
  }
});

// Use authenticateAdmin middleware from helpers

// Extract YouTube video ID from URL
function extractYouTubeId(url) {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

// Upload video (YouTube link or file upload)
router.post('/upload', authenticateAdmin, upload.single('video'), async (req, res) => {
  try {
    const { title, description, videoType, youtubeUrl } = req.body;

    if (!title || !videoType) {
      return res.status(400).json({
        success: false,
        message: 'শিরোনাম এবং ভিডিও টাইপ প্রদান করুন'
      });
    }

    // Deactivate all previous videos (only one active video at a time)
    await Video.updateMany({}, { isActive: false });

    let videoData = {
      title,
      description,
      videoType,
      uploadedBy: req.admin.email,
      isActive: true
    };

    if (videoType === 'youtube') {
      if (!youtubeUrl) {
        return res.status(400).json({
          success: false,
          message: 'YouTube URL প্রদান করুন'
        });
      }

      const youtubeId = extractYouTubeId(youtubeUrl);
      if (!youtubeId) {
        return res.status(400).json({
          success: false,
          message: 'অবৈধ YouTube URL'
        });
      }

      videoData.youtubeUrl = youtubeUrl;
      videoData.youtubeId = youtubeId;
      videoData.thumbnailUrl = `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`;

    } else if (videoType === 'upload') {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'ভিডিও ফাইল প্রদান করুন'
        });
      }

      // Upload to Cloudinary
      const uploadResult = await new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          {
            resource_type: 'video',
            folder: 'nirapodvote/promotional-videos',
            chunk_size: 6000000, // 6MB chunks for large files
            eager: [
              { width: 1280, height: 720, crop: 'limit', format: 'mp4' }
            ],
            eager_async: true
          },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        uploadStream.end(req.file.buffer);
      });

      videoData.cloudinaryUrl = uploadResult.secure_url;
      videoData.cloudinaryId = uploadResult.public_id;
      videoData.duration = uploadResult.duration;
      
      // Generate thumbnail from video
      if (uploadResult.public_id) {
        videoData.thumbnailUrl = cloudinary.url(uploadResult.public_id, {
          resource_type: 'video',
          format: 'jpg',
          transformation: [{ width: 1280, height: 720, crop: 'fill' }]
        });
      }
    }

    const video = new Video(videoData);
    await video.save();

    res.json({
      success: true,
      message: 'ভিডিও সফলভাবে আপলোড হয়েছে',
      video
    });

  } catch (error) {
    console.error('Video upload error:', error);
    res.status(500).json({
      success: false,
      message: 'ভিডিও আপলোড করতে ব্যর্থ হয়েছে',
      error: error.message
    });
  }
});

// Get active video for homepage
router.get('/active', async (req, res) => {
  try {
    const video = await Video.findOne({ isActive: true })
      .sort({ uploadedAt: -1 })
      .select('-__v');

    if (!video) {
      return res.json({
        success: true,
        video: null
      });
    }

    res.json({
      success: true,
      video
    });

  } catch (error) {
    console.error('Get active video error:', error);
    res.status(500).json({
      success: false,
      message: 'ভিডিও লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Get all videos (admin only)
router.get('/all', authenticateAdmin, async (req, res) => {
  try {
    const videos = await Video.find()
      .sort({ uploadedAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      videos
    });

  } catch (error) {
    console.error('Get all videos error:', error);
    res.status(500).json({
      success: false,
      message: 'ভিডিও লোড করতে ব্যর্থ হয়েছে'
    });
  }
});

// Delete video (admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'ভিডিও পাওয়া যায়নি'
      });
    }

    // Delete from Cloudinary if it's an uploaded video
    if (video.videoType === 'upload' && video.cloudinaryId) {
      await cloudinary.uploader.destroy(video.cloudinaryId, {
        resource_type: 'video'
      });
    }

    await Video.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'ভিডিও সফলভাবে মুছে ফেলা হয়েছে'
    });

  } catch (error) {
    console.error('Delete video error:', error);
    res.status(500).json({
      success: false,
      message: 'ভিডিও মুছতে ব্যর্থ হয়েছে'
    });
  }
});

// Toggle video active status
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);

    if (!video) {
      return res.status(404).json({
        success: false,
        message: 'ভিডিও পাওয়া যায়নি'
      });
    }

    // If activating this video, deactivate all others
    if (!video.isActive) {
      await Video.updateMany({ _id: { $ne: req.params.id } }, { isActive: false });
    }

    video.isActive = !video.isActive;
    await video.save();

    res.json({
      success: true,
      message: video.isActive ? 'ভিডিও সক্রিয় করা হয়েছে' : 'ভিডিও নিষ্ক্রিয় করা হয়েছে',
      video
    });

  } catch (error) {
    console.error('Toggle video error:', error);
    res.status(500).json({
      success: false,
      message: 'ভিডিও আপডেট করতে ব্যর্থ হয়েছে'
    });
  }
});

module.exports = router;
