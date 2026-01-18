const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zvomerdcsxvuymnpuvxk.supabase.co';
const serviceRoleKey = fs.readFileSync('sr_key.txt', 'utf8').trim();

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
    const { data, error } = await supabase
        .from('cases')
        .select('*');

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result count:', data.length);
        console.log('Sample data:', JSON.stringify(data.slice(0, 5), null, 2));
    }
}

check();
