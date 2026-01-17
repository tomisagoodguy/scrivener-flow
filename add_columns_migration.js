const { Client } = require('pg');

const client = new Client({
    connectionString:
        'postgres://postgres:iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
});

async function run() {
    try {
        await client.connect();
        console.log('Adding buyer_phone...');
        await client.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS buyer_phone text;');
        console.log('Adding seller_phone...');
        await client.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS seller_phone text;');
        console.log('Done!');
    } catch (e) {
        console.error('Migration failed:', e);
    } finally {
        await client.end();
    }
}

run();
