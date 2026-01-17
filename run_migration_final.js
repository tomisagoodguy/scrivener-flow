require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error(
        '❌ 錯誤：缺少環境變數，請確保 .env.local 中有 NEXT_PUBLIC_SUPABASE_URL 與 SUPABASE_SERVICE_ROLE_KEY'
    );
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const migrationSql = `
ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS contract_method TEXT,
ADD COLUMN IF NOT EXISTS contract_amount NUMERIC,
ADD COLUMN IF NOT EXISTS sign_diff_amount NUMERIC,
ADD COLUMN IF NOT EXISTS seal_method TEXT,
ADD COLUMN IF NOT EXISTS seal_amount NUMERIC,
ADD COLUMN IF NOT EXISTS tax_method TEXT,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC,
ADD COLUMN IF NOT EXISTS balance_method TEXT,
ADD COLUMN IF NOT EXISTS balance_amount NUMERIC;

-- 通知 PostgREST 重新讀取 Schema
NOTIFY pgrst, 'reload schema';
`;

async function run() {
    console.log('🚀 正在嘗試執行資料庫遷移...');

    // 這裡假設你有在 Supabase 建立過 exec_sql 函式
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSql });

    if (error) {
        if (error.message.includes('function "exec_sql" does not exist')) {
            console.error('\n❌ 失敗：資料庫中沒有 "exec_sql" 函式。');
            console.log('\n請手動執行以下步驟：');
            console.log('1. 開啟 Supabase Dashboard SQL Editor');
            console.log('2. 貼上並執行以下 SQL 代碼：\n');
            console.log(migrationSql);
        } else {
            console.error('❌ 執行失敗：', error.message);
        }
        process.exit(1);
    }

    console.log('✅ 資料表結構更新成功，且已要求重新整理 Schema 快取！');
}

run();
