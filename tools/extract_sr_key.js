const https = require('https');
const fs = require('fs');

const token = 'sbp_042b3193398e99132d553da47ac798d3d17c6664';
const projectRef = 'zvomerdcsxvuymnpuvxk';

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${projectRef}/api-keys`,
    method: 'GET',
    headers: {
        Authorization: `Bearer ${token}`,
    },
};

const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (d) => {
        responseData += d;
    });
    res.on('end', () => {
        try {
            const keys = JSON.parse(responseData);
            const serviceRoleKey = keys.find((k) => k.name === 'service_role')?.api_key;
            if (serviceRoleKey) {
                console.log('FOUND_KEY:', serviceRoleKey);
                fs.writeFileSync('sr_key.txt', serviceRoleKey);
            } else {
                console.log('Service role key not found');
            }
        } catch (e) {
            console.error('Parse error');
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
