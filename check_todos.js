
const { Client } = require('pg');
const connectionString = 'postgresql://postgres:iKSN3yBgEXnr5Hdx@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres';

async function check() {
    const client = new Client({ connectionString });
    try {
        await client.connect();

        // Check columns
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'todos'
        `);
        console.log('Columns in "todos" table:');
        console.log(JSON.stringify(res.rows, null, 2));

        // Check Policies
        const resPolicies = await client.query(`
            SELECT * FROM pg_policies WHERE tablename = 'todos'
        `);
        console.log('\nPolicies on "todos" table:');
        console.log(JSON.stringify(resPolicies.rows, null, 2));

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
