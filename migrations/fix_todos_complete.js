
require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const dbPass = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!dbPass || !supabaseUrl) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD or NEXT_PUBLIC_SUPABASE_URL in .env.local');
    process.exit(1);
}

const projectRef = supabaseUrl.split('//')[1].split('.')[0];
const connectionString = `postgresql://postgres:${dbPass}@db.${projectRef}.supabase.co:5432/postgres`;

const sql = `
-- 1. Add is_deleted column if missing
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- 2. Sync user_id from parent cases for any orphaned todos
--    This fixes RLS issues where new todos might have user_id but old ones don't
UPDATE todos
SET user_id = cases.user_id
FROM cases
WHERE todos.case_id = cases.id
  AND (todos.user_id IS NULL OR todos.user_id != cases.user_id);

-- 3. Ensure user_id column exists and defaults to auth.uid() (Redundant but safe)
ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 4. Re-apply RLS Policies to be sure
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own todos" ON todos;
CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own todos" ON todos;
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own todos" ON todos;
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own todos" ON todos;
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (auth.uid() = user_id);

-- 5. Reload Schema
NOTIFY pgrst, 'reload schema';
`;

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('🔌 Connected to DB');
        await client.query(sql);
        console.log('✅ Todos schema and data fixed (is_deleted added, user_id synced, RLS applied).');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
