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

async function listColumns() {
    console.log('--- DETAILED COLUMN LIST FOR "financials" ---');
    // We already have some financials probably, let's just select one
    const { data, error } = await supabase.from('financials').select('*').limit(1);

    if (error) {
        console.error('Error:', error);
    } else if (data && data.length > 0) {
        const keys = Object.keys(data[0]).sort();
        keys.forEach((k) => console.log(`COLUMN: ${k}`));
    } else {
        console.log('No data in financials.');
    }
}

listColumns();
