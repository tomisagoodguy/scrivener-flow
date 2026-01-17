const { Client } = require('pg');

const config = {
    host: 'db.zvomerdcsxvuymnpuvxk.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'iKSN3yBgEXnr5Hdxishable_xAprCS1COLD7ePcF08buG',
    ssl: { rejectUnauthorized: false }
};

const client = new Client(config);

const sql = `
-- 修改 team_notes 的 RLS 政策，允許所有登入使用者編輯和刪除

-- 啟用 RLS (如果尚未啟用)
ALTER TABLE team_notes ENABLE ROW LEVEL SECURITY;

-- 刪除舊的限制性政策 (如果存在)
DROP POLICY IF EXISTS "Users can update their own notes" ON team_notes;
DROP POLICY IF EXISTS "Users can delete their own notes" ON team_notes;
DROP POLICY IF EXISTS "Users can insert their own notes" ON team_notes;
DROP POLICY IF EXISTS "Notes are viewable by everyone" ON team_notes;
DROP POLICY IF EXISTS "Users can update any note" ON team_notes;
DROP POLICY IF EXISTS "Users can delete any note" ON team_notes;
DROP POLICY IF EXISTS "Users can insert notes" ON team_notes;


-- 重新建立政策

-- 1. 檢視政策: 所有人都可以看 (保持不變)
CREATE POLICY "Notes are viewable by everyone"
ON team_notes FOR SELECT
USING (true);

-- 2. 新增政策: 已登入使用者可以新增
CREATE POLICY "Users can insert notes"
ON team_notes FOR INSERT
WITH CHECK (auth.role() = 'authenticated');

-- 3. 更新政策: 已登入使用者可以更新任何筆記 (共筆模式)
CREATE POLICY "Users can update any note"
ON team_notes FOR UPDATE
USING (auth.role() = 'authenticated');

-- 4. 刪除政策: 已登入使用者可以刪除任何筆記 (共筆模式)
CREATE POLICY "Users can delete any note"
ON team_notes FOR DELETE
USING (auth.role() = 'authenticated');
`;

async function run() {
    try {
        console.log('Connecting to database...');
        await client.connect();
        console.log('Connected! Executing migration...');

        await client.query(sql);

        console.log('Migration successful! RLS policies updated.');
    } catch (err) {
        console.error('Migration failed:', err);
    } finally {
        await client.end();
    }
}

run();
