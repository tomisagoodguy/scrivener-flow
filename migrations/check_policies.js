require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const dbPass = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!dbPass || !supabaseUrl) {
    console.error('❌ Missing env vars');
    process.exit(1);
}

const projectRef = supabaseUrl.split('//')[1].split('.')[0];
const connectionString = `postgresql://postgres:${dbPass}@db.${projectRef}.supabase.co:5432/postgres`;

const sql = `
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check 
FROM pg_policies 
WHERE tablename = 'cases';
`;

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('✅ Connected');
        const res = await client.query(sql);
        console.table(res.rows);
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

run();
