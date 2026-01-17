const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Load env vars
// Try to find .env.local
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    const envConfig = dotenv.parse(fs.readFileSync(envPath));
    for (const k in envConfig) {
        process.env[k] = envConfig[k];
    }
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
    },
});

async function debugPermissions() {
    console.log('--- Debugging RLS Permissions ---');
    console.log('URL:', supabaseUrl);

    // 1. SELECT (Should work)
    console.log('\n[1] Testing SELECT...');
    const { data: cases, error: selectError } = await supabase
        .from('cases')
        .select('id, case_number, district, city')
        .limit(1);

    if (selectError) {
        console.error('SELECT Failed:', selectError);
    } else {
        console.log('SELECT Success. Found', cases.length, 'rows.');
        if (cases.length > 0) {
            const target = cases[0];
            console.log('Target Case:', target);

            // 2. UPDATE (The real test)
            // Try to update 'notes' field with a timestamp
            console.log('\n[2] Testing UPDATE on id:', target.id);
            const { data: updated, error: updateError } = await supabase
                .from('cases')
                .update({ notes: `Debug Note ${new Date().toISOString()}` })
                .eq('id', target.id)
                .select();

            if (updateError) {
                console.error('UPDATE Failed:', updateError);
                console.log('Hint: If status is 403 or 401, RLS is blocking Anon updates.');
            } else {
                console.log('UPDATE Success:', updated);
            }

            // 3. DELETE (Wait, don't delete real data unless it's a test case)
            // Let's create a dummy case first to test delete
            console.log('\n[3] Creating Dummy Case for DELETE test...');
            const { data: newCase, error: insertError } = await supabase
                .from('cases')
                .insert([
                    {
                        case_number: 'DEBUG-DEL-TEST',
                        buyer_name: 'Test',
                        seller_name: 'Test',
                        status: 'Processing',
                        city: 'Test',
                        district: '-',
                        updated_at: new Date().toISOString(),
                    },
                ])
                .select()
                .single();

            if (insertError) {
                console.error('INSERT Failed:', insertError);
            } else {
                console.log('INSERT Success with ID:', newCase.id);

                // Now Try DELETE
                console.log('\n[4] Testing DELETE on id:', newCase.id);
                const { error: deleteError } = await supabase.from('cases').delete().eq('id', newCase.id);

                if (deleteError) {
                    console.error('DELETE Failed:', deleteError);
                } else {
                    console.log('DELETE Success.');
                }
            }
        } else {
            console.log('No cases found to test update.');
        }
    }
}

debugPermissions();
