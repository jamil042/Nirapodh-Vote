# Cloudinary Setup Instructions

## কেন Cloudinary?
- ✅ যেকোন device থেকে PDF access করা যাবে (network এর বাইরে থেকেও)
- ✅ Free tier: 25 GB storage, 25 GB monthly bandwidth
- ✅ Reliable এবং fast CDN
- ✅ Automatic backup

## Setup Steps:

### 1. Cloudinary Account তৈরি করুন
1. যান: https://cloudinary.com/users/register/free
2. Email দিয়ে sign up করুন (GitHub/Google দিয়েও পারবেন)
3. Free plan select করুন

### 2. API Credentials পান
1. Dashboard এ লগইন করুন: https://cloudinary.com/console
2. **Product Environment Credentials** section এ দেখবেন:
   - Cloud Name
   - API Key
   - API Secret
3. এই তিনটা তথ্য copy করুন

### 3. .env File Update করুন
`.env` file এ নিচের lines update করুন:

```env
CLOUDINARY_CLOUD_NAME=আপনার_cloud_name
CLOUDINARY_API_KEY=আপনার_api_key
CLOUDINARY_API_SECRET=আপনার_api_secret
```

**উদাহরণ:**
```env
CLOUDINARY_CLOUD_NAME=dxyz123abc
CLOUDINARY_API_KEY=123456789012345
CLOUDINARY_API_SECRET=abcdefghijklmnop1234567890
```

### 4. Server Restart করুন
```bash
node server.js
```

## Test করুন:
1. Admin dashboard থেকে একটা notice create করুন + PDF upload করুন
2. Cloudinary dashboard এ check করুন: Media Library > nirapodh-vote/notices
3. যেকোন device থেকে (যেকোন network থেকে) citizen dashboard এ PDF দেখুন
4. PDF direct download/view হবে ✅

## Free Tier Limits:
- Storage: 25 GB
- Monthly Bandwidth: 25 GB
- Transformations: 25,000/month

এই project এর জন্য যথেষ্ট হবে!

## Troubleshooting:
- যদি PDF upload না হয়, console এ error check করুন
- Cloudinary credentials ঠিক আছে কিনা verify করুন
- Internet connection active আছে কিনা check করুন
