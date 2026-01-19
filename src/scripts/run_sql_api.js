const https = require('https');
require('dotenv').config();

const projectRef = process.env.SUPABASE_PROJECT_REF || 'zvomerdcsxvuymnpuvxk';
const token = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;

if (!token) {
    console.error('❌ 錯誤: 未設定 SUPABASE_PERSONAL_ACCESS_TOKEN 環境變數');
    console.error('請在 .env.local 中設定: SUPABASE_PERSONAL_ACCESS_TOKEN=your_token');
    process.exit(1);
}

const body = JSON.stringify({
    query: `
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone text;
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone text;
    `,
});

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/sql`,
    // Trying 'query' endpoint, if 404 will try others.
    // Based on V1 docs, it might be /sql.
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
    },
};

console.log('Attempting to run SQL via Management API...');

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response:', responseBody);
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.write(body);
req.end();
