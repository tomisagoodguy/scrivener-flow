const https = require('https');

const projectRef = 'zvomerdcsxvuymnpuvxk';
const token = 'sbp_042b3193398e99132d553da47ac798d3d17c6664';

const sql = `
-- 1. Ensure 'todos' table has necessary columns
ALTER TABLE todos ADD COLUMN IF NOT EXISTS case_id uuid REFERENCES cases(id) ON DELETE CASCADE;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS source_type text;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS source_key text;
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- 2. Force Schema Cache Reload
NOTIFY pgrst, 'reload schema';
`;

const body = JSON.stringify({
    query: sql
});

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/sql`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': body.length
    }
};

console.log('Running Auto-Migration to fix Todos table...');

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => { responseBody += chunk; });
    res.on('end', () => {
        console.log(`Status Code: ${res.statusCode}`);
        console.log('Response:', responseBody);
        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log("Migration Success! The 'is_deleted' column should now exist.");
        } else {
            console.log("Migration Failed.");
        }
    });
});

req.on('error', (e) => {
    console.error('Request Error:', e);
});

req.write(body);
req.end();
