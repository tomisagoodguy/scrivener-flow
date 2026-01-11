const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function run() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        if (!fs.existsSync(envPath)) {
            console.error('❌ .env.local not found at', envPath);
            console.log('\n請手動在 Supabase Dashboard SQL Editor 中執行以下 SQL：\n');
            console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;');
            console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;');
            return;
        }

        const envContent = fs.readFileSync(envPath, 'utf8');
        const lines = envContent.split('\n');
        let password = '';
        let url = '';

        for (const line of lines) {
            if (line.startsWith('SUPABASE_DB_PASSWORD=')) {
                password = line.split('=')[1].trim();
                // Handle potential quotes
                if (password.startsWith('"') && password.endsWith('"')) {
                    password = password.slice(1, -1);
                }
            }
            if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
                url = line.split('=')[1].trim();
            }
        }

        if (!password || !url) {
            console.error('❌ 缺少環境變數（需要 SUPABASE_DB_PASSWORD 和 NEXT_PUBLIC_SUPABASE_URL）');
            console.log('\n請手動在 Supabase Dashboard SQL Editor 中執行以下 SQL：\n');
            console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;');
            console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;');
            return;
        }

        // Extract project ID from URL
        const match = url.match(/https:\/\/([^.]+)\.supabase\.co/);
        const projectId = match ? match[1] : 'zvomerdcsxvuymnpuvxk';

        const host = `db.${projectId}.supabase.co`;
        const connectionString = `postgres://postgres:${password}@${host}:5432/postgres`;

        console.log(`🔌 連接到 ${host}...`);

        const client = new Client({
            connectionString,
            ssl: { rejectUnauthorized: false }
        });

        await client.connect();
        console.log('✅ 已連接！執行 migration...\n');

        await client.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;');
        console.log('✅ 已添加 buyer_phone 欄位');

        await client.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;');
        console.log('✅ 已添加 seller_phone 欄位');

        await client.end();
        console.log('\n🎉 Migration 完成！');

    } catch (e) {
        console.error('❌ Migration 失敗:', e.message);
        console.log('\n請手動在 Supabase Dashboard SQL Editor 中執行以下 SQL：\n');
        console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone TEXT;');
        console.log('ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone TEXT;');
    }
}

run();
