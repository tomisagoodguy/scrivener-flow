-- Add message_templates column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN IF NOT EXISTS message_templates JSONB DEFAULT '[]'::JSONB;
