const { createClient } = require('@supabase/supabase-client');
const fs = require('fs');
const env = fs.readFileSync('.env.local', 'utf8');
const urlMatch = env.match(/NEXT_PUBLIC_SUPABASE_URL=(.*)/);
const keyMatch = env.match(/NEXT_PUBLIC_SUPABASE_ANON_KEY=(.*)/);
const supabaseUrl = urlMatch[1].trim();
const supabaseKey = keyMatch[1].trim();
const supabase = createClient(supabaseUrl, supabaseKey);

async function addMissingColumns() {
    console.log('Attempting to check/add columns...');

    // We can't easily check columns with just the anon key if RLS is on,
    // but we can try to insert/update and see if it fails.
    // Or we can use the RPC if accessible.

    // Better way: Check if they exist by selecting them
    const { data: cData, error: cError } = await supabase.from('cases').select('tax_type').limit(1);
    if (cError && cError.message.includes('column "tax_type" does not exist')) {
        console.log('tax_type column is MISSING in cases table.');
    } else if (cError) {
        console.error('Error checking cases:', cError);
    } else {
        console.log('tax_type column exists in cases table.');
    }

    const { data: mData, error: mError } = await supabase.from('milestones').select('transfer_note').limit(1);
    if (mError && mError.message.includes('column "transfer_note" does not exist')) {
        console.log('transfer_note column is MISSING in milestones table.');
    } else if (mError) {
        console.error('Error checking milestones:', mError);
    } else {
        console.log('transfer_note column exists in milestones table.');
    }
}

addMissingColumns();
