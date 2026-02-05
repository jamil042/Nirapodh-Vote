const fetch = require('node-fetch');

async function testNoticeCreate() {
  try {
    // First login to get token
    console.log('🔐 Logging in...');
    const loginRes = await fetch('http://localhost:3000/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'superadmin', password: 'admin12345' })
    });
    
    const loginData = await loginRes.json();
    console.log('Login response:', loginData);
    
    if (!loginData.success) {
      console.log('❌ Login failed');
      return;
    }
    
    const token = loginData.token;
    console.log('✅ Got token');
    
    // Create notice
    console.log('\n📝 Creating notice...');
    const noticeRes = await fetch('http://localhost:3000/api/notice/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        title: 'টেস্ট নোটিশ API থেকে',
        type: 'সাধারণ',
        contentType: 'text',
        message: 'এটি API test থেকে তৈরি করা হয়েছে'
      })
    });
    
    const noticeData = await noticeRes.json();
    console.log('Notice response:', noticeData);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testNoticeCreate();
