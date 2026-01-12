
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function run() {
    try {
        const envPath = path.join(__dirname, '.env.local');
        const envContent = fs.readFileSync(envPath, 'utf8');
        let url = '';
        let key = '';

        envContent.split('\n').forEach(line => {
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

        console.log('--- Checking tables columns ---');

        const tables = ['cases', 'milestones', 'financials'];
        for (const table of tables) {
            console.log(`\nChecking "${table}" table...`);
            const { data, error } = await supabase.from(table).select('*').limit(1);
            if (error) {
                console.error(`Error selecting from ${table}:`, error.message);
                // Try insert probe if select * fails (sometimes it doesn't return keys if empty)
                if (table === 'cases') {
                    // already have probe logic but let's keep it simple
                }
            } else if (data && data.length > 0) {
                console.log(`Existing "${table}" columns:`, Object.keys(data[0]).join(', '));
            } else {
                console.log(`No data in "${table}", trying to probe with empty select...`);
                const { data: colsData, error: colsError } = await supabase.from(table).select().limit(0);
                // Supabase doesn't return column names on empty select without data
                // We'll rely on the fact that if we have no data, we might need a different approach.
                // But usually there is some demo data.
            }
        }

    } catch (e) {
        console.error(e);
    }
}

run();
