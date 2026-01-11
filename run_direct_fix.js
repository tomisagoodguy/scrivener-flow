
const { createClient } = require('@supabase/supabase-js');

// 直接使用從 .env.local 讀取到的資訊 (雖然只有 Anon Key，但我們先試試看，如果之前你有權限的話)
const supabaseUrl = 'https://zvomerdcsxvuymnpuvxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b21lcmRjc3h2dXltbnB1dnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTk4OTYsImV4cCI6MjA4MzI3NTg5Nn0.uQbfGdGkPgGs8ae8-5MuQxbFFRPBjL8h74QK5DSi8Uc';

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

NOTIFY pgrst, 'reload schema';
`;

async function run() {
    console.log('🚀 嘗試透過 RPC 執行更新...');
    const { data, error } = await supabase.rpc('exec_sql', { sql_query: migrationSql });

    if (error) {
        console.error('❌ RPC 失敗：', error.message);
        if (error.message.includes('not exist')) {
            console.log('原因：資料庫沒有 exec_sql 函式，且我手上沒有 Service Role Key，權限不足以直接更改結構。');
        }
    } else {
        console.log('✅ 資料表結構更新完成！');
    }
}

run();
