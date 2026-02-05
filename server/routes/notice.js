const express = require('express');
const router = express.Router();
const Notice = require('../models/Notice');
const { authenticateAdmin } = require('../utils/helpers');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Configure multer for PDF uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = 'uploads/notices';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'notice-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: function (req, file, cb) {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('শুধুমাত্র PDF ফাইল আপলোড করা যাবে'), false);
        }
    }
});

// Create notice (Admin only)
router.post('/create', authenticateAdmin, upload.single('pdfFile'), async (req, res) => {
    try {
        console.log('📝 Notice create request received');
        console.log('Admin:', req.admin);
        console.log('Body:', req.body);
        console.log('File:', req.file);

        const { title, type, message } = req.body;
        const adminId = req.admin._id || req.admin.id;
        const adminName = req.admin.username;

        console.log('Admin ID:', adminId, 'Admin Name:', adminName);

        // Validation
        if (!title || !type) {
            return res.status(400).json({ 
                success: false, 
                message: 'শিরোনাম এবং ধরন আবশ্যক' 
            });
        }

        // At least one content type required
        if (!message && !req.file) {
            return res.status(400).json({ 
                success: false, 
                message: 'বার্তা অথবা PDF ফাইল অন্তত একটি আবশ্যক' 
            });
        }

        const noticeData = {
            title,
            type,
            publishedBy: adminId,
            publishedByName: adminName
        };

        // Add message if provided
        if (message) {
            noticeData.message = message;
        }

        // Add PDF if provided
        if (req.file) {
            noticeData.pdfUrl = `/uploads/notices/${req.file.filename}`;
        }

        // Set priority based on type
        const priorityMap = {
            'জরুরি': 5,
            'ফলাফল': 4,
            'নির্বাচন সংক্রান্ত': 3,
            'প্রার্থী তালিকা': 2,
            'সতর্কতা': 2,
            'সাধারণ': 1
        };
        noticeData.priority = priorityMap[type] || 0;

        const notice = new Notice(noticeData);
        console.log('💾 Saving notice to database...');
        await notice.save();
        console.log('✅ Notice saved successfully:', notice._id);

        res.status(201).json({
            success: true,
            message: 'নোটিশ সফলভাবে প্রকাশিত হয়েছে',
            notice
        });
    } catch (error) {
        console.error('Notice creation error:', error);
        res.status(500).json({
            success: false,
            message: 'নোটিশ প্রকাশে ত্রুটি হয়েছে',
            error: error.message
        });
    }
});

// Get all active notices (Public)
router.get('/all', async (req, res) => {
    try {
        const notices = await Notice.find({ isActive: true })
            .sort({ priority: -1, createdAt: -1 })
            .select('-__v');

        res.json({
            success: true,
            notices
        });
    } catch (error) {
        console.error('Get notices error:', error);
        res.status(500).json({
            success: false,
            message: 'নোটিশ লোড করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

// Get notice by ID (Public)
router.get('/:id', async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: 'নোটিশ পাওয়া যায়নি'
            });
        }

        res.json({
            success: true,
            notice
        });
    } catch (error) {
        console.error('Get notice error:', error);
        res.status(500).json({
            success: false,
            message: 'নোটিশ লোড করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

// Update notice (Admin only)
router.put('/:id', authenticateAdmin, async (req, res) => {
    try {
        const { title, type, message, isActive } = req.body;
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: 'নোটিশ পাওয়া যায়নি'
            });
        }

        // Update fields
        if (title) notice.title = title;
        if (type) notice.type = type;
        if (message) notice.message = message;
        if (typeof isActive !== 'undefined') notice.isActive = isActive;

        await notice.save();

        res.json({
            success: true,
            message: 'নোটিশ আপডেট করা হয়েছে',
            notice
        });
    } catch (error) {
        console.error('Update notice error:', error);
        res.status(500).json({
            success: false,
            message: 'নোটিশ আপডেট করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

// Delete notice (Admin only)
router.delete('/:id', authenticateAdmin, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: 'নোটিশ পাওয়া যায়নি'
            });
        }

        // Delete PDF file if exists
        if (notice.pdfUrl) {
            const filePath = path.join(__dirname, '../../', notice.pdfUrl);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        await Notice.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'নোটিশ মুছে ফেলা হয়েছে'
        });
    } catch (error) {
        console.error('Delete notice error:', error);
        res.status(500).json({
            success: false,
            message: 'নোটিশ মুছতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

// Toggle notice active status (Admin only)
router.patch('/:id/toggle', authenticateAdmin, async (req, res) => {
    try {
        const notice = await Notice.findById(req.params.id);

        if (!notice) {
            return res.status(404).json({
                success: false,
                message: 'নোটিশ পাওয়া যায়নি'
            });
        }

        notice.isActive = !notice.isActive;
        await notice.save();

        res.json({
            success: true,
            message: `নোটিশ ${notice.isActive ? 'সক্রিয়' : 'নিষ্ক্রিয়'} করা হয়েছে`,
            notice
        });
    } catch (error) {
        console.error('Toggle notice error:', error);
        res.status(500).json({
            success: false,
            message: 'নোটিশ স্ট্যাটাস পরিবর্তন করতে সমস্যা হয়েছে',
            error: error.message
        });
    }
});

module.exports = router;
