-- 代償步驟進度追蹤資料表
CREATE TABLE IF NOT EXISTS redemption_steps (
    id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id     uuid NOT NULL REFERENCES cases(id) ON DELETE CASCADE,
    user_id     uuid NOT NULL,
    step_number int  NOT NULL CHECK (step_number BETWEEN 1 AND 7),
    is_done     bool NOT NULL DEFAULT false,
    note        text,
    created_at  timestamptz NOT NULL DEFAULT now(),
    updated_at  timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT redemption_steps_case_step_unique UNIQUE (case_id, step_number)
);

-- RLS
ALTER TABLE redemption_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY "redemption_steps_select" ON redemption_steps
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "redemption_steps_insert" ON redemption_steps
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "redemption_steps_update" ON redemption_steps
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "redemption_steps_delete" ON redemption_steps
    FOR DELETE USING (user_id = auth.uid());

-- updated_at 自動維護
CREATE OR REPLACE FUNCTION update_redemption_steps_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER redemption_steps_updated_at
    BEFORE UPDATE ON redemption_steps
    FOR EACH ROW EXECUTE FUNCTION update_redemption_steps_updated_at();
