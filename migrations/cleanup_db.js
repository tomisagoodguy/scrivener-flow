const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zvomerdcsxvuymnpuvxk.supabase.co';
const serviceRoleKey = fs.readFileSync('sr_key.txt', 'utf8').trim();

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanup() {
    console.log('Cleaning up all data to provide a fresh start...');

    // Cascading delete would be nice, but let's be explicit
    const { error: e1 } = await supabase.from('financials').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: e2 } = await supabase.from('milestones').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: e3 } = await supabase.from('todos').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    const { error: e4 } = await supabase.from('cases').delete().neq('id', '00000000-0000-0000-0000-000000000000');

    if (e1 || e2 || e3 || e4) {
        console.error('Cleanup error:', { e1, e2, e3, e4 });
    } else {
        console.log('Database is now completely empty. Ready for the first case!');
    }
}

cleanup();
