const { Client } = require('pg');

const connectionString =
    'postgresql://postgres:iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres';

const sql = `
ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;
ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;
`;

async function run() {
    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false },
    });

    try {
        await client.connect();
        console.log('✅ 已連接到資料庫');
        await client.query(sql);
        console.log('✅ 已添加 buyer_phone 和 seller_phone 欄位！');
    } catch (err) {
        console.error('❌ 更新失敗：', err.message);
    } finally {
        await client.end();
    }
}

run();
