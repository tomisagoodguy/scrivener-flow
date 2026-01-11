const { createClient } = require('@supabase/supabase-js');

// 使用環境變數或直接使用配置
const supabaseUrl = 'https://zvomerdcsxvuymnpuvxk.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b21lcmRjc3h2dXltbnB1dnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTk4OTYsImV4cCI6MjA4MzI3NTg5Nn0.uQbfGdGkPgGs8ae8-5MuQxbFFRPBjL8h74QK5DSi8Uc';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkColumns() {
    console.log('🔍 檢查 cases 表的欄位...\n');

    try {
        // 嘗試查詢包含 buyer_phone 和 seller_phone 的記錄（使用 select 來測試欄位是否存在）
        const { data, error } = await supabase
            .from('cases')
            .select('id, buyer_name, buyer_phone, seller_name, seller_phone')
            .limit(1);

        if (error) {
            if (error.message.includes('buyer_phone') || error.message.includes('seller_phone')) {
                console.log('❌ 錯誤：欄位尚未添加');
                console.log('錯誤訊息：', error.message);
                console.log('\n請在 Supabase Dashboard 執行以下 SQL：');
                console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;');
                console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;');
            } else {
                console.log('⚠️  查詢時發生錯誤：', error.message);
            }
        } else {
            console.log('✅ 成功！buyer_phone 和 seller_phone 欄位已存在');
            console.log('✅ 查詢成功（即使沒有資料也代表欄位存在）');
            console.log('\n現在您可以測試建立案件功能了！');
        }
    } catch (err) {
        console.error('❌ 檢查失敗：', err.message);
    }
}

checkColumns();
