
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

async function probe() {
    const { data: c } = await supabase.from('cases').select('id').limit(1).single();
    if (!c) {
        console.log('No cases found to probe.');
        return;
    }

    console.log('--- MILESTONES COLUMNS ---');
    const { data: m, error: me } = await supabase.from('milestones').insert([{ case_id: c.id }]).select();
    if (me) console.error('M error:', me);
    else {
        Object.keys(m[0]).sort().forEach(k => console.log(`M_COL: ${k}`));
        await supabase.from('milestones').delete().eq('id', m[0].id);
    }

    console.log('\n--- FINANCIALS COLUMNS ---');
    const { data: f, error: fe } = await supabase.from('financials').insert([{ case_id: c.id }]).select();
    if (fe) console.error('F error:', fe);
    else {
        Object.keys(f[0]).sort().forEach(k => console.log(`F_COL: ${k}`));
        await supabase.from('financials').delete().eq('id', f[0].id);
    }
}

probe();
