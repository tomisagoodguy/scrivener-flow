const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = 'https://zvomerdcsxvuymnpuvxk.supabase.co';
const serviceRoleKey = fs.readFileSync('sr_key.txt', 'utf8').trim();

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function check() {
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Users:', JSON.stringify(data.users.map(u => ({ id: u.id, email: u.email })), null, 2));
    }
}

check();
