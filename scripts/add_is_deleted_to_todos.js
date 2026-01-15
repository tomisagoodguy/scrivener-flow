
const { Client } = require('pg');
const connectionString = 'postgresql://postgres:iKSN3yBgEXnr5Hdx@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres';

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('Connected!');
        await client.query('ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_deleted BOOLEAN DEFAULT false;');
        console.log('Column is_deleted added.');
        await client.end();
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

run();
