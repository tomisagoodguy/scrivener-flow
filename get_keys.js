const https = require('https');

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
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseData);
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.end();
