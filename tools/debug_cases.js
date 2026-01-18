const https = require('https');

const projectRef = 'zvomerdcsxvuymnpuvxk';
const token = 'sbp_042b3193398e99132d553da47ac798d3d17c6664';

const sql = `SELECT id, case_number, user_id, created_at FROM cases;`;

const body = JSON.stringify({
    query: sql,
});

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/sql`,
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length,
    }
};

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log('Results:', responseBody);
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.write(body);
req.end();
