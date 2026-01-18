const { Client } = require('pg');

const connectionString =
    'postgresql://postgres:iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres';

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

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('✅ 已連接到資料庫');
        await client.query(sql);
        console.log('✅ 所有欄位更新成功，快取已刷新！');
    } catch (err) {
        console.error('❌ 更新失敗：', err.message);
        if (err.message.includes('authentication failed')) {
            console.log(
                '錯誤：資料庫密碼不正確。請前往 Supabase Dashboard -> Project Settings -> Database -> Reset Database Password 重新設定密碼。'
            );
        }
    } finally {
        await client.end();
    }
}

run();
