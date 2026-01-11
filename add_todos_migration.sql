ALTER TABLE cases ADD COLUMN IF NOT EXISTS todos JSONB DEFAULT '{}'::jsonb;
UPDATE cases SET todos = '{}'::jsonb WHERE todos IS NULL;
