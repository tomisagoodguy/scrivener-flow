const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

// Try to load .env.local first, then .env
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
} else {
    dotenv.config({ path: path.resolve(__dirname, '.env') });
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectTodos() {
    console.log('Fetching todos...');
    // Fetch all todos
    const { data: todos, error } = await supabase
        .from('todos')
        .select('id, content, case_id, source_type, source_key, created_at, due_date, "is_deleted"')
        .eq('is_deleted', false)
        .order('case_id');

    if (error) {
        console.error('Error fetching todos:', error);
        return;
    }

    console.log(`Found ${todos.length} active todos.`);

    // Group by case_id to see duplicates
    const grouped = {};
    todos.forEach((t) => {
        const cid = t.case_id || 'no-case';
        if (!grouped[cid]) grouped[cid] = [];
        grouped[cid].push(t);
    });

    Object.keys(grouped).forEach((cid) => {
        const tasks = grouped[cid];
        if (tasks.length > 0) {
            console.log(`\nCase: ${cid} (${tasks.length} tasks)`);
            tasks.forEach((t) => {
                console.log(
                    `  [${t.id}] ${t.content} | Key: ${t.source_key} | Type: ${t.source_type} | Date: ${t.due_date}`
                );
            });
        }
    });
}

inspectTodos();
