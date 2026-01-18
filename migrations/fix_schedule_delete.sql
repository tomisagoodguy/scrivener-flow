-- 1. Ensure 'is_deleted' column exists in 'todos' table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

-- 2. Ensure 'user_id' column exists in 'todos' table
ALTER TABLE todos ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 3. Sync 'user_id' from parent cases for orphaned/legacy todos
--    This ensures users can delete todos found in their cases even if they didn't create them originally
UPDATE todos
SET user_id = cases.user_id
FROM cases
WHERE todos.case_id = cases.id
  AND (todos.user_id IS NULL OR todos.user_id != cases.user_id);

-- 4. Enable RLS on 'todos'
ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

-- 5. Re-apply RLS Policies for 'todos'
--    Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view own todos" ON todos;
DROP POLICY IF EXISTS "Users can insert own todos" ON todos;
DROP POLICY IF EXISTS "Users can update own todos" ON todos;
DROP POLICY IF EXISTS "Users can delete own todos" ON todos;

--    Create comprehensive policies based on user_id
CREATE POLICY "Users can view own todos" ON todos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own todos" ON todos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own todos" ON todos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own todos" ON todos FOR DELETE USING (auth.uid() = user_id);

-- 6. Reload Schema Cache (to make sure API sees the new columns)
NOTIFY pgrst, 'reload schema';
