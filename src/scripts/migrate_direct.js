/**
 * 直接連線資料庫執行 SQL 遷移
 * 
 * 使用 node-postgres (pg) 直接連線到 Supabase Postgres 資料庫
 * 避免 Management API 的 404/權限問題
 */

const { Client } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env.local') });

// 取得環境變數
const DB_HOST = process.env.NEXT_PUBLIC_SUPABASE_URL
    ? process.env.NEXT_PUBLIC_SUPABASE_URL.replace('https://', 'db.').replace('.supabase.co', '.supabase.co')
    : 'db.zvomerdcsxvuymnpuvxk.supabase.co';

const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

if (!DB_PASSWORD) {
    console.error('❌ 錯誤: 未設定 SUPABASE_DB_PASSWORD');
    process.exit(1);
}

// 連線字串 (使用 Transaction Pooler - port 6543)
// 或者 Session Pooler - port 5432
// Supabase 預設建議直接連線使用 5432
const connectionString = `postgres://postgres:${DB_PASSWORD}@${DB_HOST}:5432/postgres`;

// 取得 SQL 檔案
const sqlFileName = process.argv[2];
if (!sqlFileName) {
    console.error('❌ 錯誤: 請指定 SQL 檔案名稱');
    console.error('範例: node src/scripts/migrate_direct.js create_encryption_keys.sql');
    process.exit(1);
}

const sqlFilePath = path.join(__dirname, '../../supabase/migrations', sqlFileName);
if (!fs.existsSync(sqlFilePath)) {
    console.error(`❌ 錯誤: SQL 檔案不存在: ${sqlFilePath}`);
    process.exit(1);
}

const sqlContent = fs.readFileSync(sqlFilePath, 'utf-8');

// 執行遷移
async function runMigration() {
    console.log(`🔌 正在連線到資料庫: ${DB_HOST}`);

    const client = new Client({
        connectionString,
        ssl: { rejectUnauthorized: false } // Supabase 需要 SSL
    });

    try {
        await client.connect();
        console.log('✅ 連線成功');

        console.log(`📄 正在執行 SQL: ${sqlFileName}`);
        await client.query(sqlContent);

        console.log('🎉 SQL 執行成功！');
    } catch (err) {
        console.error('❌ 執行失敗:', err.message);
        if (err.position) {
            console.error(`📍 錯誤位置: 字元 ${err.position}`);
        }
    } finally {
        await client.end();
    }
}

runMigration();
