const https = require('https');
const url =
    'https://zvomerdcsxvuymnpuvxk.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b21lcmRjc3h2dXltbnB1dnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTk4OTYsImV4cCI6MjA4MzI3NTg5Nn0.uQbfGdGkPgGs8ae8-5MuQxbFFRPBjL8h74QK5DSi8Uc';

https
    .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => {
            data += chunk;
        });
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (!json.definitions || !json.definitions.milestones) {
                    console.log('無法找到 milestones 定義，可能是 API 快取尚未更新或 API Key 權限限制。');
                    console.log('現有定義清單:', Object.keys(json.definitions || {}));
                    return;
                }
                const props = json.definitions.milestones.properties;
                console.log('--- Milestones 欄位清單 ---');
                console.log(Object.keys(props).sort().join(', '));
                console.log('\n--- 檢查特定欄位 ---');
                ['sign_diff_date', 'sign_diff_amount', 'balance_amount', 'balance_payment_date'].forEach((col) => {
                    console.log(`${col}: ${props[col] ? '✅ 存在' : '❌ 不存在'}`);
                });
            } catch (e) {
                console.error('解析失敗:', e.message);
                console.log('回應內容:', data.substring(0, 500));
            }
        });
    })
    .on('error', (err) => {
        console.error('請求失敗:', err.message);
    });
