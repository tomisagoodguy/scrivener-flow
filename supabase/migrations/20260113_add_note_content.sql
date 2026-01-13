-- Create a column to store rich text content (JSON format) for Notion-like editor
ALTER TABLE cases ADD COLUMN IF NOT EXISTS note_content JSONB;
