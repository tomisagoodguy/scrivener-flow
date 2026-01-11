
const https = require('https');

const token = 'sbp_042b3193398e99132d553da47ac798d3d17c6664';
const projectRef = 'zvomerdcsxvuymnpuvxk';

const sql = `
ALTER TABLE cases 
ADD COLUMN IF NOT EXISTS buyer_phone TEXT,
ADD COLUMN IF NOT EXISTS seller_phone TEXT,
ADD COLUMN IF NOT EXISTS tax_type TEXT,
ADD COLUMN IF NOT EXISTS buyer_loan_bank TEXT,
ADD COLUMN IF NOT EXISTS seller_loan_bank TEXT;

ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS sign_diff_date DATE,
ADD COLUMN IF NOT EXISTS sign_diff_amount NUMERIC,
ADD COLUMN IF NOT EXISTS contract_method TEXT,
ADD COLUMN IF NOT EXISTS contract_amount NUMERIC,
ADD COLUMN IF NOT EXISTS seal_method TEXT,
ADD COLUMN IF NOT EXISTS seal_amount NUMERIC,
ADD COLUMN IF NOT EXISTS tax_method TEXT,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC,
ADD COLUMN IF NOT EXISTS balance_method TEXT,
ADD COLUMN IF NOT EXISTS balance_amount NUMERIC;

NOTIFY pgrst, 'reload schema';
`;

const data = JSON.stringify({ query: sql });

const options = {
    hostname: 'api.supabase.com',
    port: 443,
    path: `/v1/projects/${projectRef}/queries`,
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': data.length
    }
};

const req = https.request(options, (res) => {
    let responseData = '';
    res.on('data', (d) => { responseData += d; });
    res.on('end', () => {
        console.log('Status Code:', res.statusCode);
        console.log('Response:', responseData);
        if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log('✅ 資料庫欄位更新成功！');
        } else {
            console.log('❌ 更新失敗，請檢查 Token 權限或 SQL 語法。');
        }
    });
});

req.on('error', (error) => {
    console.error(error);
});

req.write(data);
req.end();
