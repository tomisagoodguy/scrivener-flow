const { Client } = require('pg');

const connectionString =
    'postgresql://postgres:iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres';

const sql = `
-- 1. 在案件表增加「稅單性質」欄位
ALTER TABLE cases ADD COLUMN IF NOT EXISTS tax_type TEXT;

-- 2. 在進度表增加「過戶備註」欄位
ALTER TABLE milestones ADD COLUMN IF NOT EXISTS transfer_note TEXT;

-- 3. 強制重新整理 API 快取 (重要！)
NOTIFY pgrst, 'reload schema';
`;

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('✅ 已連接到資料庫 (Connected to DB)');
        await client.query(sql);
        console.log('✅ 資料庫結構更新成功，快取已刷新！ (Updated schema and reloaded cache)');
    } catch (err) {
        console.error('❌ 更新失敗 (Update Failed)：', err.message);
    } finally {
        await client.end();
    }
}

run();
