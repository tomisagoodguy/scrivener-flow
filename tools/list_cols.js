const { createClient } = require('@supabase/supabase-client');
// No dotenv, just hardcode for debug if needed, but let's try to read it from .env.local manually
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);

const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
    const { data: mData, error: mError } = await supabase.from('milestones').select('*').limit(1);
    const { data: cData, error: cError } = await supabase.from('cases').select('*').limit(1);

    if (mError) console.error('M Error:', mError);
    else if (mData && mData.length > 0) console.log('Milestone columns:', Object.keys(mData[0]));

    if (cError) console.error('C Error:', cError);
    else if (cData && cData.length > 0) console.log('Case columns:', Object.keys(cData[0]));
}

listColumns();
