const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://zvomerdcsxvuymnpuvxk.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp2b21lcmRjc3h2dXltbnB1dnhrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc2OTk4OTYsImV4cCI6MjA4MzI3NTg5Nn0.uQbfGdGkPgGs8ae8-5MuQxbFFRPBjL8h74QK5DSi8Uc';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
    const { data, error } = await supabase
        .from('cases')
        .select('id, case_number, created_at')
        .limit(10);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Result:', JSON.stringify(data, null, 2));
    }
}

check();
