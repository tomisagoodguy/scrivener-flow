require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

const dbPass = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!dbPass || !supabaseUrl) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD or NEXT_PUBLIC_SUPABASE_URL in .env.local');
    process.exit(1);
}

const projectRef = supabaseUrl.split('//')[1].split('.')[0];
const connectionString = `postgresql://postgres:${dbPass}@db.${projectRef}.supabase.co:5432/postgres`;

console.log(`🔌 Connecting to ${projectRef}...`);
console.log('DB Pass exists:', !!dbPass);
console.log('Supabase URL exists:', !!supabaseUrl);

const sqlFile = path.join(__dirname, '20260118_add_on_hold_status.sql');
const sql = fs.readFileSync(sqlFile, 'utf8');

async function run() {
    console.log('Starting run()...');
    const client = new Client({ connectionString });

    try {
        await client.connect();
        console.log('✅ Connected to DB');
        console.log('📝 Running migration: 20260118_add_on_hold_status.sql');
        await client.query(sql);
        console.log('✅ Migration applied successfully!');
    } catch (err) {
        console.error('❌ Error executing sql:', err.message);
    } finally {
        await client.end();
    }
}

run();
