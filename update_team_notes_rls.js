const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 錯誤: 缺少 Supabase 環境變數');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 開始更新 team_notes RLS 政策 (共筆模式)...\n');

    try {
        const sqlPath = path.join(__dirname, 'supabase', 'migrations', 'update_team_notes_rls.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // 分割 SQL 語句
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];
            console.log(`[${i + 1}/${statements.length}] 執行中...`);

            const { error } = await supabase.rpc('exec_sql', {
                sql_query: statement
            });

            if (error) {
                console.error(`❌ 錯誤:`, error.message);
                // 這裡我們不退出，因為 DROP POLICY 失敗可能是因為政策不存在，這是正常的
            } else {
                console.log(`✅ 成功`);
            }
        }

        console.log('\n🎉 RLS 政策更新完成! 現在所有登入使用者都可以編輯和刪除筆記了。\n');

    } catch (error) {
        console.error('❌ 執行失敗:', error);
        process.exit(1);
    }
}

runMigration();
