require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');

const dbPass = process.env.SUPABASE_DB_PASSWORD;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!dbPass || !supabaseUrl) {
    console.error('❌ Missing SUPABASE_DB_PASSWORD or NEXT_PUBLIC_SUPABASE_URL in .env.local');
    process.exit(1);
}

// Extract project ref from URL (e.g. https://xyz.supabase.co -> xyz)
const projectRef = supabaseUrl.split('//')[1].split('.')[0];
const connectionString = `postgresql://postgres:${dbPass}@db.${projectRef}.supabase.co:5432/postgres`;

console.log(`🔌 Connecting to ${projectRef} with provided password...`);

const sql = `
-- 1. Add user_id column
ALTER TABLE cases ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Index
CREATE INDEX IF NOT EXISTS idx_cases_user_id ON cases(user_id);

-- 3. Enable RLS
ALTER TABLE cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE financials ENABLE ROW LEVEL SECURITY;

-- 4. Create Policies for CASES
DROP POLICY IF EXISTS "Users can view own cases" ON cases;
CREATE POLICY "Users can view own cases" ON cases FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own cases" ON cases;
CREATE POLICY "Users can insert own cases" ON cases FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own cases" ON cases;
CREATE POLICY "Users can update own cases" ON cases FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own cases" ON cases;
CREATE POLICY "Users can delete own cases" ON cases FOR DELETE USING (auth.uid() = user_id);

-- 5. Create Policies for MILESTONES (Join Strategy)
DROP POLICY IF EXISTS "Users can view own milestones" ON milestones;
CREATE POLICY "Users can view own milestones" ON milestones FOR SELECT USING (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own milestones" ON milestones;
CREATE POLICY "Users can insert own milestones" ON milestones FOR INSERT WITH CHECK (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own milestones" ON milestones;
CREATE POLICY "Users can update own milestones" ON milestones FOR UPDATE USING (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own milestones" ON milestones;
CREATE POLICY "Users can delete own milestones" ON milestones FOR DELETE USING (
    exists (select 1 from cases where cases.id = milestones.case_id and cases.user_id = auth.uid())
);

-- 6. Create Policies for FINANCIALS (Join Strategy)
DROP POLICY IF EXISTS "Users can view own financials" ON financials;
CREATE POLICY "Users can view own financials" ON financials FOR SELECT USING (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can insert own financials" ON financials;
CREATE POLICY "Users can insert own financials" ON financials FOR INSERT WITH CHECK (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update own financials" ON financials;
CREATE POLICY "Users can update own financials" ON financials FOR UPDATE USING (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);

DROP POLICY IF EXISTS "Users can delete own financials" ON financials;
CREATE POLICY "Users can delete own financials" ON financials FOR DELETE USING (
    exists (select 1 from cases where cases.id = financials.case_id and cases.user_id = auth.uid())
);

-- 8. Create Policies for TODOS
ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON todos(user_id);
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own todos" ON todos;
CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert own todos" ON todos;
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own todos" ON todos;
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own todos" ON todos;
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (auth.uid() = user_id);

-- 7. NOTIFY
NOTIFY pgrst, 'reload schema';
`;

async function run() {
    const client = new Client({ connectionString });
    try {
        await client.connect();
        console.log('✅ Connected to DB');
        await client.query(sql);
        console.log('✅ RLS Policies Applied & user_id setup complete.');
    } catch (err) {
        console.error('❌ Error:', err.message);
    } finally {
        await client.end();
    }
}

run();
