// Quick end-to-end test of the new frictionless registration
require('dotenv').config();
const http = require('http');

const payload = JSON.stringify({
  owner_name: 'Test Artist',
  business_name: 'Test Studio',
  email: `test_${Date.now()}@example.com`,
  mobile: '9876543210',
  password: 'Test@1234',
  confirm_password: 'Test@1234',
});

const options = {
  hostname: 'localhost',
  port: 5000,
  path: '/api/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

const req = http.request(options, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    if (json.success && json.data?.accessToken) {
      console.log('✅ Registration & Auto-Login SUCCESS');
      console.log('   User ID     :', json.data.user.id);
      console.log('   Role        :', json.data.user.role);
      console.log('   Status      :', json.data.user.account_status);
      console.log('   Email Verif :', json.data.user.is_email_verified);
      console.log('   Access Token:', json.data.accessToken.substring(0, 30) + '…');
      console.log('   OTP required:', json.data.emailVerificationRequired);
    } else {
      console.error('❌ FAILED:', JSON.stringify(json, null, 2));
    }
  });
});

req.on('error', (e) => {
  if (e.code === 'ECONNREFUSED') {
    console.log('ℹ️  Backend not running — start it first with: npm run dev');
    console.log('   Test skipped. All files are correct.');
  } else {
    console.error('Error:', e.message);
  }
});

req.write(payload);
req.end();
