const { Client } = require('pg');
const connectionString =
    'postgresql://postgres:iKSN3yBgEXnr5Hdx@db.zvomerdcsxvuymnpuvxk.supabase.co:6543/postgres?prepareThreshold=0';

async function run() {
    const client = new Client({ connectionString });
    await client.connect();
    try {
        console.log('Adding cancellation_type column...');
        await client.query('ALTER TABLE cases ADD COLUMN IF NOT EXISTS cancellation_type TEXT;');
        console.log('Success!');
    } catch (err) {
        console.error('Error:', err);
    } finally {
        await client.end();
    }
}
run();
