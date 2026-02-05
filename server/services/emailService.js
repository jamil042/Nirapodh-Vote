// Email service for sending admin credentials
const nodemailer = require('nodemailer');

/**
 * Send admin credentials via email
 * @param {string} recipientEmail - Recipient email address
 * @param {string} adminId - Admin username/ID
 * @param {string} initialPassword - Initial password
 * @returns {Promise<Object>} - Email sending result
 */
const sendAdminCredentials = async (recipientEmail, adminId, initialPassword) => {
  try {
    // Check if email service is configured
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;

    if (!emailUser || !emailPassword) {
      console.warn('⚠️ Email Configuration missing.');
      return { success: false, message: 'Email service not configured' };
    }

    // Create transporter using Gmail
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: emailUser,
        pass: emailPassword
      }
    });

    // Email content
    const mailOptions = {
      from: `নিরাপদ ভোট সিস্টেম <${emailUser}>`,
      to: recipientEmail,
      subject: 'নিরাপদ ভোট - প্রশাসক অ্যাকাউন্ট তৈরি হয়েছে / Admin Account Created',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #1e7e34 0%, #28a745 100%); color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border: 1px solid #dee2e6; }
            .credentials { background: white; padding: 20px; margin: 20px 0; border-left: 4px solid #1e7e34; }
            .credential-item { margin: 10px 0; }
            .label { font-weight: bold; color: #1e7e34; }
            .value { font-family: monospace; font-size: 16px; background: #e9ecef; padding: 5px 10px; display: inline-block; margin-left: 10px; }
            .warning { background: #fff3cd; border: 1px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { background: #343a40; color: white; padding: 15px; text-align: center; font-size: 12px; border-radius: 0 0 5px 5px; }
            .btn { background: #1e7e34; color: white; padding: 12px 30px; text-decoration: none; display: inline-block; margin: 20px 0; border-radius: 5px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1 style="margin: 0;">🇧🇩 নিরাপদ ভোট</h1>
              <p style="margin: 5px 0;">বাংলাদেশ নির্বাচন কমিশন</p>
              <p style="margin: 0; font-size: 14px;">Bangladesh Election Commission</p>
            </div>
            
            <div class="content">
              <h2 style="color: #1e7e34;">প্রশাসক অ্যাকাউন্ট তৈরি হয়েছে</h2>
              <p>আপনার জন্য নিরাপদ ভোট সিস্টেমে একটি প্রশাসক অ্যাকাউন্ট তৈরি করা হয়েছে।</p>
              
              <div class="credentials">
                <h3 style="margin-top: 0; color: #1e7e34;">লগইন তথ্য / Login Credentials:</h3>
                <div class="credential-item">
                  <span class="label">প্রশাসক আইডি / Admin ID:</span>
                  <span class="value">${adminId}</span>
                </div>
                <div class="credential-item">
                  <span class="label">প্রাথমিক পাসওয়ার্ড / Initial Password:</span>
                  <span class="value">${initialPassword}</span>
                </div>
              </div>

              <div class="warning">
                <strong>⚠️ গুরুত্বপূর্ণ নির্দেশনা:</strong>
                <ul style="margin: 10px 0;">
                  <li>প্রথমবার লগইন করার পর আপনাকে অবশ্যই পাসওয়ার্ড পরিবর্তন করতে হবে।</li>
                  <li>এই ইমেইলটি গোপনীয় রাখুন এবং কাউকে শেয়ার করবেন না।</li>
                  <li>পাসওয়ার্ড পরিবর্তনের পর এই পাসওয়ার্ড আর কাজ করবে না।</li>
                </ul>
              </div>

              <div style="text-align: center;">
                <a href="https://nirapod-vote.gov.bd/admin-login.html" class="btn">এখনই লগইন করুন</a>
              </div>

              <p style="margin-top: 30px; color: #666; font-size: 14px;">
                যদি আপনি এই অ্যাকাউন্ট তৈরির অনুরোধ না করে থাকেন, তাহলে অনুগ্রহ করে অবিলম্বে আমাদের সাথে যোগাযোগ করুন।
              </p>
            </div>
            
            <div class="footer">
              <p style="margin: 0;">বাংলাদেশ নির্বাচন কমিশন</p>
              <p style="margin: 5px 0;">Bangladesh Election Commission</p>
              <p style="margin: 0; font-size: 11px;">© 2026 নিরাপদ ভোট সিস্টেম. সর্বস্বত্ব সংরক্ষিত।</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    // Send email
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Admin credentials email sent:', info.messageId);
    
    return {
      success: true,
      message: 'ইমেইল সফলভাবে পাঠানো হয়েছে',
      messageId: info.messageId
    };

  } catch (error) {
    console.error('❌ Email sending error:', error);
    return {
      success: false,
      message: 'ইমেইল পাঠাতে ব্যর্থ হয়েছে',
      error: error.message
    };
  }
};

module.exports = {
  sendAdminCredentials
};
