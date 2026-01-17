const { Client } = require('pg');

const client = new Client({
    connectionString:
        'postgresql://postgres:iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres',
    ssl: { rejectUnauthorized: false },
});

async function run() {
    try {
        await client.connect();
        console.log('Connected!');
        await client.query("ALTER TABLE cases ADD COLUMN IF NOT EXISTS todos JSONB DEFAULT '{}'::jsonb;");
        console.log('Column added.');
        await client.end();
    } catch (e) {
        console.error('Migration failed:', e);
    }
}

run();
