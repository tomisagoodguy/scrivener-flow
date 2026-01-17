
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing URL or SERVICE_ROLE_KEY');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSchema() {
    console.log('Checking todos columns...');

    // Try to select is_deleted from a row (or empty check)
    const { data, error } = await supabase
        .from('todos')
        .select('id, is_deleted, user_id')
        .limit(1);

    if (error) {
        console.error('Error selecting columns:', error.message);
        // If error message mentions "column does not exist", we know.
    } else {
        console.log('Select success. First row:', data);
        if (data && data.length > 0) {
            console.log('Verifying user_id logic...');
        }
    }

    // Check if we can soft delete
    // We can't really test update without a valid ID, but the select error is enough to know about column existence.
}

checkSchema();
