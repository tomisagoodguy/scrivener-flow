const { Client } = require('pg');

const config = {
    host: 'db.zvomerdcsxvuymnpuvxk.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG',
    ssl: { rejectUnauthorized: false }
};

const client = new Client(config);

async function check() {
    try {
        await client.connect();
        const res = await client.query("SELECT id, case_number, user_id, created_at FROM cases WHERE case_number = 'AB1252885'");
        console.log('Case Record:', JSON.stringify(res.rows, null, 2));

        const countRes = await client.query("SELECT count(*) FROM cases");
        console.log('Total Cases Count:', countRes.rows[0].count);

        const nullUserRes = await client.query("SELECT count(*) FROM cases WHERE user_id IS NULL");
        console.log('Cases with NULL user_id:', nullUserRes.rows[0].count);

    } catch (err) {
        console.error('Check failed:', err);
    } finally {
        await client.end();
    }
}

check();
