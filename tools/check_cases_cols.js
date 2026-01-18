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

async function checkCases() {
    const { data } = await supabase.from('cases').select('*').limit(1);
    if (data && data.length > 0) {
        Object.keys(data[0])
            .sort()
            .forEach((k) => console.log(`CASE_COL: ${k}`));
    }
}

checkCases();
