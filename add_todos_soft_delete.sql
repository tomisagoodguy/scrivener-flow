-- Add is_deleted column to todos table
ALTER TABLE todos
ADD COLUMN IF NOT EXISTS is_deleted boolean DEFAULT false;

COMMENT ON COLUMN todos.is_deleted IS '軟刪除標記: true 表示被使用者刪除';

-- Reload Schema Cache
NOTIFY pgrst, 'reload schema';
