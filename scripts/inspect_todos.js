const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const envPath = path.join(__dirname, '..', '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        let url = '';
        let key = '';

        envContent.split('\n').forEach((line) => {
            if (line.includes('NEXT_PUBLIC_SUPABASE_URL=')) {
                const parts = line.split('=');
                if (parts.length >= 2) url = parts[1].trim().replace(/['"]/g, '');
            }
            if (line.includes('NEXT_PUBLIC_SUPABASE_ANON_KEY=')) {
                const parts = line.split('=');
                if (parts.length >= 2) key = parts[1].trim().replace(/['"]/g, '');
            }
        });

        if (!url || !key) {
            console.error('Missing env vars');
            return;
        }

        const supabase = createClient(url, key);

        console.log('--- Checking todos table columns ---');
        const { data, error } = await supabase.from('todos').select().limit(1);

        if (error) {
            console.error('Error selecting from todos:', error);
            // If error is 42703 (undefined column), it means table exists but maybe column issue?
            // If error is 42P01 (undefined table), table missing.
            // But usually API returns generic error object.

            // Try to Insert to probe columns if Select fails due to RLS?
            // If RLS denies select, error.message will say so or return empty.
        } else {
            if (data && data.length > 0) {
                console.log('Existing todos columns:', Object.keys(data[0]).join(', '));
            } else {
                console.log('Todos table exists but is empty or RLS hides data.');
            }
        }
    } catch (e) {
        console.error(e);
    }
}

run();
