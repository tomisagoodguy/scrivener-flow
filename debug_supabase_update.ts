
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Load env from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpdate() {
    const caseId = '1801a90f-8d34-42ce-af2f-38a2b09f7ce0'; // User provided ID
    console.log(`Testing update on case: ${caseId}`);

    // 1. Fetch
    const { data, error: fetchError } = await supabase
        .from('cases')
        .select('todos')
        .eq('id', caseId)
        .single();

    if (fetchError) {
        console.error('Fetch Error:', fetchError);
        return;
    }
    console.log('Current Todos:', data?.todos);

    // 2. Update
    // Let's try to add a dummy todo or toggle one
    const newTodos = { ...(data?.todos || {}), 'DEBUG_TEST_ITEM': true };

    const { data: updateData, error: updateError } = await supabase
        .from('cases')
        .update({ todos: newTodos })
        .eq('id', caseId)
        .select();

    if (updateError) {
        console.error('Update Error Full Object:', JSON.stringify(updateError, null, 2));
        console.error('Update Error Code:', updateError.code);
        console.error('Update Error Message:', updateError.message);
        console.error('Update Error Details:', updateError.details);
        console.error('Update Error Hint:', updateError.hint);
    } else {
        console.log('Update Success!', updateData);
    }
}

testUpdate();
