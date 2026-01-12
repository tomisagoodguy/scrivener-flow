const { createClient } = require('@supabase/supabase-client');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listColumns() {
    const { data, error } = await supabase
        .from('milestones')
        .select('*')
        .limit(1);

    if (error) {
        console.error('Error fetching milestones:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log('Columns in milestones:', Object.keys(data[0]));
    } else {
        console.log('No data in milestones to determine columns.');
    }
}

listColumns();
