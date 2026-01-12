
const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function findAllTables() {
    console.log('--- Finding all tables with case_id ---');

    // We can probe common table names or use a more clever approach.
    // Since we don't have access to information_schema easily via PostgREST,
    // let's try some likely candidates:
    const tables = ['cases', 'milestones', 'financials', 'todos', 'logs', 'comments', 'attachments', 'tasks'];

    for (const t of tables) {
        const { error } = await supabase.from(t).select('case_id').limit(1);
        if (!error) {
            console.log(`FOUND table with case_id: ${t}`);
        } else if (error.code !== '42P01') { // 42P01 is "relation does not exist"
            // Table exists but maybe no case_id?
            const { error: e2 } = await supabase.from(t).select('*').limit(1);
            if (!e2) console.log(`FOUND table (other schema): ${t}`);
        }
    }
}

findAllTables();
