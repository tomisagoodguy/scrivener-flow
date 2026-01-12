const { Client } = require('pg');
const connectionString = 'postgresql://postgres:iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG@db.zvomerdcsxvuymnpuvxk.supabase.co:5432/postgres';

async function check() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        const res = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'cases'
        `);
        console.log('Columns in "cases" table:');
        console.table(res.rows);

        const res2 = await client.query(`
            SELECT column_name, data_type, is_nullable 
            FROM information_schema.columns 
            WHERE table_name = 'milestones'
        `);
        console.log('\nColumns in "milestones" table:');
        console.table(res2.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}
check();
