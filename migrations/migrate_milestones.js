const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Fallback to Anon Key if Service Role is missing

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const sql = `
ALTER TABLE milestones 
ADD COLUMN IF NOT EXISTS contract_method TEXT,
ADD COLUMN IF NOT EXISTS contract_amount NUMERIC,
ADD COLUMN IF NOT EXISTS sign_diff_amount NUMERIC,
ADD COLUMN IF NOT EXISTS seal_method TEXT,
ADD COLUMN IF NOT EXISTS seal_amount NUMERIC,
ADD COLUMN IF NOT EXISTS tax_method TEXT,
ADD COLUMN IF NOT EXISTS tax_amount NUMERIC,
ADD COLUMN IF NOT EXISTS balance_method TEXT,
ADD COLUMN IF NOT EXISTS balance_amount NUMERIC;
`;

async function runMigration() {
    console.log('Starting migration with URL:', supabaseUrl);
    // Try direct table check first to see if we have permissions
    const { data, error } = await supabase.from('milestones').select('id').limit(1);
    if (error) {
        console.error('Connection check failed:', error);
    } else {
        console.log('Connection successful, attempting SQL via RPC...');
    }

    const { error: rpcError } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (rpcError) {
        console.error('Migration failed (RPC exec_sql probably not defined or no permission):', rpcError);
        console.log('\nPlease manually run this SQL in Supabase Dashboard:');
        console.log(sql);
        process.exit(1);
    }

    console.log('Migration successful');
}

runMigration();
