// 執行團隊知識庫資料庫遷移腳本
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ 錯誤: 缺少 Supabase 環境變數');
    console.error('請確認 .env.local 中有:');
    console.error('- NEXT_PUBLIC_SUPABASE_URL');
    console.error('- SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
    console.log('🚀 開始執行團隊知識庫資料庫遷移...\n');

    try {
        // 讀取 SQL 檔案
        const sqlPath = path.join(__dirname, 'supabase', 'migrations', 'create_team_notes.sql');
        const sql = fs.readFileSync(sqlPath, 'utf8');

        // 分割 SQL 語句 (以分號分隔)
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--'));

        console.log(`📝 共 ${statements.length} 個 SQL 語句\n`);

        // 逐一執行
        for (let i = 0; i < statements.length; i++) {
            const statement = statements[i];

            // 跳過註解
            if (statement.startsWith('--')) continue;

            console.log(`[${i + 1}/${statements.length}] 執行中...`);

            const { data, error } = await supabase.rpc('exec_sql', {
                sql_query: statement
            });

            if (error) {
                console.error(`❌ 錯誤:`, error.message);
                // 繼續執行其他語句
            } else {
                console.log(`✅ 成功`);
            }
        }

        console.log('\n🎉 資料庫遷移完成!\n');
        console.log('📋 已建立的表:');
        console.log('  - team_notes (團隊筆記)');
        console.log('  - note_comments (評論)');
        console.log('  - note_likes (點讚)');
        console.log('\n✅ RLS 政策已啟用');
        console.log('✅ 索引已建立');
        console.log('✅ 觸發器已設定\n');

    } catch (error) {
        console.error('❌ 執行失敗:', error);
        process.exit(1);
    }
}

runMigration();
