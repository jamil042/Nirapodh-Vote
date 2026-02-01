# Superadmin and Admin Creation System

## Overview
This system allows a superadmin to create new admin accounts. The workflow includes:
1. Superadmin creates new admin with email and initial password
2. New admin receives credentials via email
3. New admin logs in with initial password
4. System redirects to password update page
5. After password update, admin can access the dashboard

## Features

### 1. Role-Based Access
- **Superadmin**: Can create new admins and access all features
- **Admin**: Can access all features except creating new admins

### 2. Admin Creation Workflow
1. Superadmin navigates to Settings section
2. Fills in the "Create New Admin" form:
   - Admin ID (username)
   - Email address
   - Initial password
3. System sends credentials to admin's email
4. New admin logs in with initial password
5. First login redirects to password update page
6. After password update, admin must login again with new password

### 3. Email Notification
New admins receive a professional email with:
- Admin ID
- Initial password
- Login instructions
- Security warnings

## Database Schema

### Admin Model
```javascript
{
  username: String,      // Admin ID
  email: String,         // Email address (unique)
  password: String,      // Hashed password
  role: String,          // 'admin' or 'superadmin'
  isFirstLogin: Boolean, // Flag for first-time login
  createdAt: Date        // Creation timestamp
}
```

## API Endpoints

### 1. Admin Login
**POST** `/api/admin/login`
```json
{
  "username": "admin",
  "password": "password123"
}
```

Response includes `isFirstLogin` flag to determine redirect destination.

### 2. Create Admin (Superadmin Only)
**POST** `/api/admin/create-admin`
```json
{
  "username": "ADMIN-2026-002",
  "email": "newadmin@example.com",
  "initialPassword": "password123"
}
```

Headers: `Authorization: Bearer <superadmin_token>`

### 3. Update Password
**POST** `/api/admin/update-password`
```json
{
  "newPassword": "newpassword123"
}
```

Headers: `Authorization: Bearer <admin_token>`

### 4. Get All Admins (Superadmin Only)
**GET** `/api/admin/admins`

Headers: `Authorization: Bearer <superadmin_token>`

## Files Modified/Created

### Backend Files
1. **server/models/Admin.js** - Updated with email and isFirstLogin fields
2. **server/routes/admin.js** - Added admin creation and password update routes
3. **server/services/emailService.js** - New email service for sending credentials
4. **server/scripts/create-superadmin.js** - Script to create/convert superadmin
5. **server/scripts/update-admin-email.js** - Script to add email to existing admin

### Frontend Files
1. **admin-dashboard.html** - Updated header and added admin creation section
2. **admin-login.html** - Updated header
3. **update-password.html** - New password update page
4. **assets/js/admin.js** - Added admin management functions
5. **assets/js/admin-login-backend.js** - Added first login redirect logic
6. **assets/js/update-password.js** - Password update functionality
7. **assets/css/admin.css** - Added styles for admin management

## Setup Instructions

### 1. Install Dependencies
```bash
npm install nodemailer
```

### 2. Configure Email (Already Done)
Your `.env` file already has:
```
EMAIL_USER=tamimsharif2181@gmail.com
EMAIL_PASSWORD=ycxsfqwfqkievxzw
```

### 3. Create/Update Superadmin
Your existing admin is already a superadmin with email configured.

To check:
```bash
node server/scripts/create-superadmin.js
```

To update admin email:
```bash
node server/scripts/update-admin-email.js <username> <email>
```

## Usage Guide

### For Superadmin

#### Login
1. Visit `/admin-login.html`
2. Enter username: `admin`
3. Enter your password
4. Click login

#### Create New Admin
1. After login, click "সেটিংস" (Settings) in sidebar
2. Scroll to "নতুন প্রশাসক তৈরি করুন" section
3. Fill in:
   - প্রশাসক আইডি (Admin ID): e.g., `ADMIN-2026-002`
   - ইমেইল ঠিকানা (Email): Valid email address
   - প্রাথমিক পাসওয়ার্ড (Initial Password): At least 6 characters
4. Click "প্রশাসক তৈরি করুন" (Create Admin)
5. System will send email to the new admin

#### View Admin List
In Settings section, you'll see "প্রশাসক তালিকা" (Admin List) showing:
- Username
- Email
- Role (সুপার অ্যাডমিন or অ্যাডমিন)
- Creation date

### For New Admin

#### First Login
1. Check email for credentials
2. Visit `/admin-login.html`
3. Enter received Admin ID and password
4. System automatically redirects to password update page

#### Update Password
1. Enter new password (minimum 6 characters)
2. Confirm new password
3. Click "পাসওয়ার্ড পরিবর্তন করুন" (Change Password)
4. System redirects to login page

#### Second Login
1. Use Admin ID and NEW password
2. Access dashboard normally

## Security Features

1. **Password Hashing**: All passwords are hashed using bcrypt
2. **JWT Authentication**: Secure token-based authentication
3. **Role-Based Access**: Middleware prevents non-superadmins from creating admins
4. **First Login Flag**: Ensures password change on first login
5. **Session Management**: Tokens stored in sessionStorage (cleared on logout)

## Header Updates

All admin pages now show:
- Bengali: **বাংলাদেশ নির্বাচন কমিশন**
- English: **Bangladesh Election Commission**

(Previously: প্রধান নির্বাচন কমিশনার / Bangladesh Election Commissioner)

## Troubleshooting

### Email Not Sending
Check `.env` file for correct email credentials:
```
EMAIL_USER=your_gmail@gmail.com
EMAIL_PASSWORD=your_app_password
```

Note: Use Gmail App Password, not regular password.

### Admin Creation Fails
1. Check if admin with same username/email already exists
2. Verify superadmin is logged in
3. Check network console for error messages

### Password Update Fails
1. Ensure password is at least 6 characters
2. Verify passwords match
3. Check if token is valid (re-login if needed)

## Testing

### Test Superadmin Login
```
Username: admin
Password: <your password>
```

### Test Admin Creation
1. Login as superadmin
2. Go to Settings
3. Create test admin:
   - Username: TEST-ADMIN-001
   - Email: test@example.com
   - Password: test123456
4. Check email inbox for credentials
5. Test new admin login

## Notes

- Only superadmins can create new admins
- New admins are created with role='admin' (not superadmin)
- Email service uses Gmail SMTP
- All passwords are minimum 6 characters
- First login always requires password change
- Session tokens expire after 7 days

## Future Enhancements

Possible improvements:
- Admin deletion/deactivation
- Password strength requirements
- Two-factor authentication
- Admin activity logs
- Bulk admin creation
- Admin role modification
