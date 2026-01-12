
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function findTheBlocker() {
    console.log('--- 🔎 正在搜尋阻止刪除的關聯物 ---');

    // 先抓一筆現有的案件 ID
    const { data: cases } = await supabase.from('cases').select('id, case_number').limit(1);

    if (!cases || cases.length === 0) {
        console.log('找不到案件，無法測試。');
        return;
    }

    const targetId = cases[0].id;
    console.log(`測試目標案件: ${cases[0].case_number} (${targetId})`);

    // 直接嘗試刪除案件本體
    const { error } = await supabase.from('cases').delete().eq('id', targetId);

    if (error) {
        console.log('\n❌ 刪除失敗！系統報錯詳情：');
        console.log('錯誤代碼:', error.code);
        console.log('錯誤訊息:', error.message);
        console.log('細節資訊:', error.details);
        console.log('建議提示:', error.hint);

        if (error.details && error.details.includes('is still referenced from table')) {
            const match = error.details.match(/table "(.+)"/);
            if (match) {
                console.log(`\n💡 抓到了！阻止刪除的祕密表格是: 【 ${match[1]} 】`);
            }
        }
    } else {
        console.log('✅ 刪除成功（這筆案件可能沒有關聯資料）。請換一筆有資料的案件測試。');
    }
}

findTheBlocker();
