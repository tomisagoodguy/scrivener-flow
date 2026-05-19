CREATE TABLE IF NOT EXISTS line_followers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       text UNIQUE NOT NULL,
  display_name  text,
  is_active     boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
