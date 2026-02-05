# অভিযোগ ব্যবস্থাপনা সিস্টেম (Complaint Management System)

## Overview
এই সিস্টেমে নাগরিকরা ভোট বা প্রযুক্তিগত সমস্যার জন্য অভিযোগ দায়ের করতে পারে এবং প্রশাসক সেগুলি সমাধান করতে পারে।

## Features

### নাগরিক (Citizen) Features:
1. **অভিযোগ দায়ের করা**
   - বিভিন্ন ধরনের অভিযোগ (ভোটের সমস্যা, প্রযুক্তিগত সমস্যা, নিরাপত্তা সমস্যা, অন্যান্য)
   - বিস্তারিত বিবরণ লেখা
   - ছবি/ডকুমেন্ট সংযুক্ত করা (সর্বোচ্চ ৫টি ফাইল, প্রতিটি ৫MB)

2. **অভিযোগ ট্র্যাকিং**
   - নিজের সকল অভিযোগ দেখা
   - অভিযোগের স্ট্যাটাস দেখা (প্রক্রিয়াধীন, উত্তর প্রদান, সমাধানকৃত, প্রত্যাখ্যাত)
   - প্রশাসকের প্রতিক্রিয়া দেখা
   - প্রশাসক কর্তৃক পাঠানো ডকুমেন্ট ডাউনলোড করা

### প্রশাসক (Admin) Features:
1. **অভিযোগ ব্যবস্থাপনা**
   - সকল অভিযোগ দেখা
   - স্ট্যাটাস, প্রায়োরিটি এবং সার্চ দিয়ে ফিল্টার করা
   - অভিযোগের বিস্তারিত দেখা

2. **প্রতিক্রিয়া প্রদান**
   - অভিযোগের উত্তর লেখা
   - ডকুমেন্ট/সমাধান ফাইল সংযুক্ত করা
   - স্ট্যাটাস পরিবর্তন করা (প্রক্রিয়াধীন → উত্তর প্রদান → সমাধানকৃত)
   - প্রায়োরিটি সেট করা (সাধারণ, জরুরি, অত্যন্ত জরুরি)

3. **পরিসংখ্যান**
   - মোট অভিযোগ
   - প্রক্রিয়াধীন অভিযোগ
   - উত্তর প্রদান করা অভিযোগ
   - সমাধানকৃত অভিযোগ

## API Endpoints

### Citizen Endpoints:
- `POST /api/complaint/submit` - নতুন অভিযোগ জমা
- `GET /api/complaint/my-complaints/:nid` - নিজের অভিযোগসমূহ
- `GET /api/complaint/complaint/:complaintId` - নির্দিষ্ট অভিযোগের বিস্তারিত

### Admin Endpoints:
- `GET /api/complaint/admin/all` - সকল অভিযোগ (ফিল্টার সহ)
- `PATCH /api/complaint/admin/update-status/:complaintId` - স্ট্যাটাস/প্রায়োরিটি আপডেট
- `POST /api/complaint/admin/respond/:complaintId` - অভিযোগের প্রতিক্রিয়া
- `DELETE /api/complaint/admin/delete/:complaintId` - অভিযোগ মুছুন

### Common:
- `GET /api/complaint/download/:filename` - ফাইল ডাউনলোড

## Database Schema

### Complaint Model:
```javascript
{
  complaintId: String (Unique ID, e.g., "COMP-123456789"),
  citizenId: ObjectId (Reference to User),
  citizenNID: String,
  citizenName: String,
  votingArea: String,
  complaintType: String (Enum),
  description: String,
  attachments: [
    {
      filename: String,
      originalName: String,
      path: String,
      mimetype: String,
      size: Number
    }
  ],
  status: String (প্রক্রিয়াধীন, উত্তর প্রদান, সমাধানকৃত, প্রত্যাখ্যাত),
  priority: String (সাধারণ, জরুরি, অত্যন্ত জরুরি),
  adminResponse: {
    respondedBy: String,
    respondedAt: Date,
    message: String,
    attachments: [...]
  },
  submittedAt: Date,
  resolvedAt: Date
}
```

## File Structure

### Backend:
- `server/models/Complaint.js` - Complaint mongoose model
- `server/routes/complaint.js` - Complaint API routes
- `uploads/complaints/` - Uploaded files storage

### Frontend:
- `assets/js/citizen-complaints.js` - Citizen complaint management
- `assets/js/admin-complaints.js` - Admin complaint management
- `assets/css/citizen-dashboard.css` - Citizen UI styles
- `assets/css/admin.css` - Admin UI styles

## Usage Instructions

### For Citizens:
1. লগইন করুন citizen dashboard এ
2. সাইডবারে "অভিযোগ" মেনুতে ক্লিক করুন
3. "নতুন অভিযোগ দাখিল করুন" ফর্মে:
   - অভিযোগের ধরন নির্বাচন করুন
   - বিস্তারিত বিবরণ লিখুন
   - প্রয়োজনে ছবি/ডকুমেন্ট আপলোড করুন
   - "অভিযোগ জমা দিন" বাটনে ক্লিক করুন
4. আপনার সকল অভিযোগ "আপনার অভিযোগসমূহ" সেকশনে দেখতে পাবেন
5. যেকোনো অভিযোগে ক্লিক করে বিস্তারিত এবং প্রশাসকের প্রতিক্রিয়া দেখুন

### For Admins:
1. লগইন করুন admin dashboard এ
2. সাইডবারে "অভিযোগ ব্যবস্থাপনা" মেনুতে ক্লিক করুন
3. পরিসংখ্যান দেখুন ড্যাশবোর্ডের উপরে
4. ফিল্টার ব্যবহার করে নির্দিষ্ট অভিযোগ খুঁজুন
5. যেকোনো অভিযোগে ক্লিক করে বিস্তারিত দেখুন
6. মডালে:
   - নাগরিকের অভিযোগ পড়ুন
   - সংযুক্ত ফাইল দেখুন
   - প্রতিক্রিয়া লিখুন
   - প্রয়োজনে সমাধান ডকুমেন্ট আপলোড করুন
   - স্ট্যাটাস এবং প্রায়োরিটি সেট করুন
   - "প্রতিক্রিয়া জমা দিন" বাটনে ক্লিক করুন

## Technical Details

### File Upload:
- Powered by **Multer** middleware
- Storage location: `uploads/complaints/`
- Allowed file types: JPEG, JPG, PNG, PDF, DOC, DOCX
- Maximum file size: 5MB per file
- Maximum files: 5 per submission

### Security:
- NID validation for citizens
- Files stored with unique generated names
- File type validation
- File size validation
- Path traversal protection

### Status Flow:
```
প্রক্রিয়াধীন (Initial) 
    ↓
উত্তর প্রদান (Admin responded)
    ↓
সমাধানকৃত (Resolved)
```

### Priority Levels:
- **সাধারণ** (Normal) - Regular complaints
- **জরুরি** (Urgent) - Important issues
- **অত্যন্ত জরুরি** (Critical) - Critical issues requiring immediate attention

## Dependencies

```json
{
  "multer": "^1.4.5-lts.1" // For file uploads
}
```

## Future Enhancements

1. Email notifications when admin responds
2. SMS notifications for critical complaints
3. Bulk complaint actions for admins
4. Export complaints to CSV/PDF
5. Complaint analytics and reporting
6. Auto-assignment of complaints to specific admins
7. Complaint categories with sub-types
8. Attachment preview without download
9. Complaint reopening feature
10. Admin notes (internal comments not visible to citizens)

## Troubleshooting

### Common Issues:

1. **File upload not working:**
   - Check `uploads/complaints/` directory exists
   - Verify file size is under 5MB
   - Ensure file type is allowed

2. **Complaints not loading:**
   - Check MongoDB connection
   - Verify API endpoints are accessible
   - Check browser console for errors

3. **Images not displaying:**
   - Ensure server is serving static files from `/uploads`
   - Check file path in database

## Support

For issues or questions, contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** January 2026
