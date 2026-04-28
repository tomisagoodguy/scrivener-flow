ALTER TABLE cases ADD COLUMN IF NOT EXISTS chat_groups jsonb DEFAULT '{}';
