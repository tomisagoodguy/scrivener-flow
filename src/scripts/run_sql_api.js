const https = require('https');

const projectRef = 'zvomerdcsxvuymnpuvxk';
const token = 'sbp_042b3193398e99132d553da47ac798d3d17c6664';
const body = JSON.stringify({
    query: `
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone text;
        ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone text;
    `
});

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/sql`,
    // Trying 'query' endpoint, if 404 will try others. 
    // Based on V1 docs, it might be /sql.
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length
    }
};

console.log('Attempting to run SQL via Management API...');

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
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
