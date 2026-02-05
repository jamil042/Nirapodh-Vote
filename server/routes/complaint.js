// Complaint Routes - Citizen & Admin Complaint Management
const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Complaint = require('../models/Complaint');
const User = require('../models/User');

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '../../uploads/complaints');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'complaint-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Allow images and documents
  const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('শুধুমাত্র ছবি এবং ডকুমেন্ট ফাইল আপলোড করুন!'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// Generate unique complaint ID
function generateComplaintId() {
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
  return `COMP-${timestamp}${random}`;
}

// ===== CITIZEN ROUTES =====

// Submit a new complaint
router.post('/submit', upload.array('attachments', 5), async (req, res) => {
  try {
    const { nid, complaintType, description } = req.body;

    if (!nid || !complaintType || !description) {
      return res.status(400).json({
        success: false,
        message: 'সকল তথ্য প্রদান করুন'
      });
    }

    // Find citizen
    const citizen = await User.findOne({ nid });
    if (!citizen) {
      return res.status(404).json({
        success: false,
        message: 'নাগরিক খুঁজে পাওয়া যায়নি'
      });
    }

    // Process uploaded files
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    // Create complaint
    const complaint = new Complaint({
      complaintId: generateComplaintId(),
      citizenId: citizen._id,
      citizenNID: citizen.nid,
      citizenName: citizen.name,
      votingArea: citizen.votingArea || 'ঢাকা-১',
      complaintType,
      description,
      attachments
    });

    await complaint.save();

    res.status(201).json({
      success: true,
      message: 'অভিযোগ সফলভাবে জমা হয়েছে',
      complaint: {
        complaintId: complaint.complaintId,
        status: complaint.status,
        submittedAt: complaint.submittedAt
      }
    });

  } catch (error) {
    console.error('Complaint submission error:', error);
    res.status(500).json({
      success: false,
      message: 'অভিযোগ জমা দিতে সমস্যা হয়েছে'
    });
  }
});

// Get citizen's own complaints
router.get('/my-complaints/:nid', async (req, res) => {
  try {
    const { nid } = req.params;

    const complaints = await Complaint.find({ citizenNID: nid })
      .sort({ submittedAt: -1 })
      .select('-__v');

    res.json({
      success: true,
      complaints
    });

  } catch (error) {
    console.error('Get complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'অভিযোগ লোড করতে সমস্যা হয়েছে'
    });
  }
});

// Get specific complaint by ID
router.get('/complaint/:complaintId', async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findOne({ complaintId })
      .select('-__v');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'অভিযোগ খুঁজে পাওয়া যায়নি'
      });
    }

    res.json({
      success: true,
      complaint
    });

  } catch (error) {
    console.error('Get complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'অভিযোগ লোড করতে সমস্যা হয়েছে'
    });
  }
});

// ===== ADMIN ROUTES =====

// Get all complaints (Admin)
router.get('/admin/all', async (req, res) => {
  try {
    const { status, priority, votingArea, search } = req.query;
    
    let query = {};
    
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (votingArea) query.votingArea = votingArea;
    if (search) {
      query.$or = [
        { complaintId: { $regex: search, $options: 'i' } },
        { citizenNID: { $regex: search, $options: 'i' } },
        { citizenName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const complaints = await Complaint.find(query)
      .sort({ submittedAt: -1 })
      .select('-__v');

    // Get statistics
    const stats = {
      total: await Complaint.countDocuments(),
      processing: await Complaint.countDocuments({ status: 'প্রক্রিয়াধীন' }),
      answered: await Complaint.countDocuments({ status: 'উত্তর প্রদান' }),
      resolved: await Complaint.countDocuments({ status: 'সমাধানকৃত' }),
      rejected: await Complaint.countDocuments({ status: 'প্রত্যাখ্যাত' })
    };

    res.json({
      success: true,
      complaints,
      stats
    });

  } catch (error) {
    console.error('Get all complaints error:', error);
    res.status(500).json({
      success: false,
      message: 'অভিযোগ লোড করতে সমস্যা হয়েছে'
    });
  }
});

// Update complaint status (Admin)
router.patch('/admin/update-status/:complaintId', async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { status, priority } = req.body;

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'অভিযোগ খুঁজে পাওয়া যায়নি'
      });
    }

    if (status) complaint.status = status;
    if (priority) complaint.priority = priority;
    
    if (status === 'সমাধানকৃত' && !complaint.resolvedAt) {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    res.json({
      success: true,
      message: 'স্ট্যাটাস আপডেট হয়েছে',
      complaint
    });

  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({
      success: false,
      message: 'স্ট্যাটাস আপডেট করতে সমস্যা হয়েছে'
    });
  }
});

// Respond to complaint (Admin)
router.post('/admin/respond/:complaintId', upload.array('attachments', 5), async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { message, respondedBy, status } = req.body;

    if (!message || !respondedBy) {
      return res.status(400).json({
        success: false,
        message: 'প্রতিক্রিয়া এবং অ্যাডমিন নাম প্রদান করুন'
      });
    }

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'অভিযোগ খুঁজে পাওয়া যায়নি'
      });
    }

    // Process uploaded files
    const attachments = req.files ? req.files.map(file => ({
      filename: file.filename,
      originalName: file.originalname,
      path: file.path,
      mimetype: file.mimetype,
      size: file.size
    })) : [];

    // Update complaint with admin response
    complaint.adminResponse = {
      respondedBy,
      respondedAt: new Date(),
      message,
      attachments
    };

    if (status) {
      complaint.status = status;
    } else {
      complaint.status = 'উত্তর প্রদান';
    }

    if (status === 'সমাধানকৃত') {
      complaint.resolvedAt = new Date();
    }

    await complaint.save();

    res.json({
      success: true,
      message: 'প্রতিক্রিয়া সফলভাবে জমা হয়েছে',
      complaint
    });

  } catch (error) {
    console.error('Admin respond error:', error);
    res.status(500).json({
      success: false,
      message: 'প্রতিক্রিয়া জমা দিতে সমস্যা হয়েছে'
    });
  }
});

// Delete complaint (Admin)
router.delete('/admin/delete/:complaintId', async (req, res) => {
  try {
    const { complaintId } = req.params;

    const complaint = await Complaint.findOne({ complaintId });
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'অভিযোগ খুঁজে পাওয়া যায়নি'
      });
    }

    // Delete associated files
    [...complaint.attachments, ...(complaint.adminResponse?.attachments || [])].forEach(file => {
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }
    });

    await Complaint.deleteOne({ complaintId });

    res.json({
      success: true,
      message: 'অভিযোগ মুছে ফেলা হয়েছে'
    });

  } catch (error) {
    console.error('Delete complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'অভিযোগ মুছতে সমস্যা হয়েছে'
    });
  }
});

// Download attachment
router.get('/download/:filename', (req, res) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(uploadsDir, filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        message: 'ফাইল খুঁজে পাওয়া যায়নি'
      });
    }

    res.download(filePath);

  } catch (error) {
    console.error('Download error:', error);
    res.status(500).json({
      success: false,
      message: 'ফাইল ডাউনলোড করতে সমস্যা হয়েছে'
    });
  }
});

// Resolve complaint (Admin)
router.put('/:complaintId/resolve', async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { adminResponse } = req.body;

    if (!adminResponse) {
      return res.status(400).json({
        success: false,
        message: 'প্রশাসক মন্তব্য প্রদান করুন'
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'অভিযোগ খুঁজে পাওয়া যায়নি'
      });
    }

    complaint.status = 'resolved';
    complaint.adminResponse = adminResponse;
    complaint.resolvedAt = new Date();
    await complaint.save();

    res.json({
      success: true,
      message: 'অভিযোগ সফলভাবে সমাধান করা হয়েছে',
      complaint
    });

  } catch (error) {
    console.error('Resolve complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'অভিযোগ সমাধান করতে সমস্যা হয়েছে'
    });
  }
});

// Reject complaint (Admin)
router.put('/:complaintId/reject', async (req, res) => {
  try {
    const { complaintId } = req.params;
    const { adminResponse } = req.body;

    if (!adminResponse) {
      return res.status(400).json({
        success: false,
        message: 'প্রশাসক মন্তব্য প্রদান করুন'
      });
    }

    const complaint = await Complaint.findById(complaintId);
    if (!complaint) {
      return res.status(404).json({
        success: false,
        message: 'অভিযোগ খুঁজে পাওয়া যায়নি'
      });
    }

    complaint.status = 'rejected';
    complaint.adminResponse = adminResponse;
    await complaint.save();

    res.json({
      success: true,
      message: 'অভিযোগ প্রত্যাখ্যান করা হয়েছে',
      complaint
    });

  } catch (error) {
    console.error('Reject complaint error:', error);
    res.status(500).json({
      success: false,
      message: 'অভিযোগ প্রত্যাখ্যান করতে সমস্যা হয়েছে'
    });
  }
});

module.exports = router;
