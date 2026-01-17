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
    console.log('--- DETAILED COLUMN LIST FOR "cases" ---');
    const { data: inserted, error } = await supabase
        .from('cases')
        .insert([
            {
                case_number: 'SCHEMA_PROBE_4',
                district: '-',
                status: 'Processing',
                buyer_name: 'Probe',
                seller_name: 'Probe',
                city: 'Probe',
            },
        ])
        .select();

    if (error) {
        console.error('Insert ERROR:', error);
    } else if (inserted && inserted.length > 0) {
        const keys = Object.keys(inserted[0]).sort();
        console.log(`TOTAL COLUMNS: ${keys.length}`);
        keys.forEach((k) => console.log(`COLUMN: ${k}`));
        await supabase.from('cases').delete().eq('id', inserted[0].id);
    }
}

listColumns();
