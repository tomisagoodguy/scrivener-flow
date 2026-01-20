const https = require('https');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

const projectRef = process.env.SUPABASE_PROJECT_REF || 'zvomerdcsxvuymnpuvxk';
const token = process.env.SUPABASE_PERSONAL_ACCESS_TOKEN;

if (!token) {
    console.error('❌ 錯誤: 未設定 SUPABASE_PERSONAL_ACCESS_TOKEN 環境變數');
    console.error('請在 .env.local 中設定: SUPABASE_PERSONAL_ACCESS_TOKEN=your_token');
    process.exit(1);
}

// 取得命令列參數中的 SQL 檔案名稱
const sqlFileName = process.argv[2];

if (!sqlFileName) {
    console.error('❌ 錯誤: 請指定 SQL 檔案名稱');
    console.error('使用方式: node src/scripts/run_sql_api.js <檔案名稱>.sql');
    process.exit(1);
}

// 讀取 SQL 檔案內容
const sqlFilePath = path.join(__dirname, '../../supabase/migrations', sqlFileName);

if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ 錯誤: SQL 檔案不存在: ${sqlFilePath}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');
console.log(`📄 讀取 SQL 檔案: ${sqlFileName}`);
console.log(`📏 檔案大小: ${sqlContent.length} bytes`);

const body = JSON.stringify({
    query: sqlContent,
});

const options = {
    hostname: 'api.supabase.com',
    path: `/v1/projects/${projectRef}/query`, // 修正：從 /sql 改為 /query
    method: 'POST',
    headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
    },
};

console.log('🚀 正在透過 Supabase Management API 執行 SQL...\n');

const req = https.request(options, (res) => {
    let responseBody = '';
    res.on('data', (chunk) => {
        responseBody += chunk;
    });
    res.on('end', () => {
        console.log(`📊 HTTP 狀態碼: ${res.statusCode}`);

        if (res.statusCode === 200 || res.statusCode === 201) {
            console.log('✅ SQL 執行成功!');
        } else {
            console.error('❌ SQL 執行失敗!');
        }

        console.log('\n回應內容:');
        try {
            const jsonResponse = JSON.parse(responseBody);
            console.log(JSON.stringify(jsonResponse, null, 2));
        } catch {
            console.log(responseBody);
        }
    });
});

req.on('error', (e) => {
    console.error('❌ 請求錯誤:', e.message);
});

req.write(body);
req.end();

